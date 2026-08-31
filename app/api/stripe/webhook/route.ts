import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { authorizeDeposit } from "@/app/libs/deposit";
import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { notificationService } from "@/app/services/notificationService";

export const runtime = "nodejs";

async function POSTHandler(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret)
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature rejected", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (alreadyProcessed)
    return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.redriveUserId;
      if (userId) {
        await prisma.user.updateMany({
          where: { id: userId, stripeConnectedAccountId: account.id },
          data: {
            stripeDetailsSubmitted: account.details_submitted,
            stripePayoutsEnabled:
              account.payouts_enabled &&
              account.capabilities?.transfers === "active",
          },
        });
      }
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservationId;
      if (reservationId && session.payment_status === "paid") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (!paymentIntentId)
          throw new Error("Completed Checkout Session has no PaymentIntent");
        const intent = await getStripe().paymentIntents.retrieve(
          paymentIntentId,
          { expand: ["latest_charge"] },
        );
        const chargeId =
          typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        const payment = await prisma.payment.findUnique({
          where: { reservationId },
        });
        if (
          !payment ||
          payment.amount !== session.amount_total ||
          session.currency !== payment.currency ||
          !chargeId
        ) {
          throw new Error(
            "Stripe payment does not match the reservation ledger",
          );
        }
        const reservationRow = await prisma.reservation.findUnique({
          where: { id: reservationId },
          select: { endDate: true, confirmedAt: true },
        });
        const paidAt = new Date();
        // The return handover normally releases the payout. If it stalls, this
        // is the backstop the payouts cron uses to auto-resolve.
        const autoReleaseAt = reservationRow
          ? new Date(reservationRow.endDate.getTime() + 72 * 60 * 60_000)
          : null;

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID_HELD",
              stripePaymentIntentId: paymentIntentId,
              stripeChargeId: chargeId,
              paidAt,
              failureMessage: null,
            },
          }),
          prisma.reservation.update({
            where: { id: reservationId },
            data: {
              paymentStatus: "PAID_HELD",
              paidAt,
              confirmedAt: paidAt,
              ...(autoReleaseAt ? { autoReleaseAt } : {}),
            },
          }),
          prisma.auditEvent.create({
            data: {
              actorUserId: payment.renterId,
              action: "PAYMENT_CAPTURED",
              targetType: "Reservation",
              targetId: reservationId,
              metadata: {
                paymentIntentId,
                amount: payment.amount,
                currency: payment.currency,
              },
            },
          }),
        ]);

        // Tell both sides the trip is locked in — only on the first capture.
        if (!reservationRow?.confirmedAt) {
          try {
            await Promise.all([
              notificationService.notifyBookingConfirmed(
                payment.renterId,
                "your booking",
                reservationId,
                "GUEST",
              ),
              notificationService.notifyBookingConfirmed(
                payment.ownerId,
                "your vehicle",
                reservationId,
                "HOST",
              ),
            ]);
          } catch (notifyError) {
            console.error("Booking-confirmed notification failed", notifyError);
          }
          // Pre-authorise the refundable security deposit (dormant unless
          // DEPOSIT_PREAUTH_ENABLED=true).
          await authorizeDeposit(reservationId).catch((depositError) =>
            console.error("Deposit authorisation failed", depositError),
          );
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await prisma.payment.updateMany({
        where: {
          stripeCheckoutSessionId: session.id,
          status: "CHECKOUT_PENDING",
        },
        data: { status: "CHECKOUT_EXPIRED" },
      });
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const reservationId = intent.metadata?.reservationId;
      await prisma.payment.updateMany({
        where: reservationId
          ? { reservationId }
          : { stripePaymentIntentId: intent.id },
        data: {
          status: "PAYMENT_FAILED",
          failureMessage:
            intent.last_payment_error?.message?.slice(0, 500) ||
            "Payment failed",
        },
      });
      const failedReservation = reservationId
        ? await prisma.reservation.findUnique({
            where: { id: reservationId },
            select: { userId: true, status: true, listing: { select: { title: true } } },
          })
        : null;
      if (failedReservation && failedReservation.status === "APPROVED") {
        try {
          await notificationService.notifyPaymentFailed(
            failedReservation.userId,
            failedReservation.listing.title,
            reservationId!,
          );
        } catch (notifyError) {
          console.error("Payment-failed notification failed", notifyError);
        }
      }
    }
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

export const POST = monitorApiRoute("/api/stripe/webhook", POSTHandler, "POST");
