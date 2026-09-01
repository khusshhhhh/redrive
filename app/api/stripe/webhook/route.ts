import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { markReservationPaidHeld } from "@/app/libs/payments";
import { markExtensionPaid } from "@/app/libs/tripExtension";
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
    } else if (
      event.type === "checkout.session.completed" &&
      (event.data.object as Stripe.Checkout.Session).metadata?.kind === "trip_extension"
    ) {
      // Trip-extension top-up: move the dates + totals and record the charge.
      const session = event.data.object as Stripe.Checkout.Session;
      const extensionId = session.metadata?.extensionId;
      const reservationId = session.metadata?.reservationId;
      if (extensionId && reservationId && session.payment_status === "paid") {
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        const intent = paymentIntentId
          ? await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] })
          : null;
        const chargeId =
          typeof intent?.latest_charge === "string" ? intent.latest_charge : intent?.latest_charge?.id;
        if (chargeId) {
          await markExtensionPaid({ extensionId, reservationId, chargeId }).catch((extError) =>
            console.error("Extension-paid apply failed", extensionId, extError),
          );
        }
      }
      await prisma.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      return NextResponse.json({ received: true });
    } else if (
      event.type === "payment_intent.succeeded" &&
      (event.data.object as Stripe.PaymentIntent).metadata?.kind === "trip_extension"
    ) {
      // Safety net for the off-session (saved-card) extension charge.
      const intent = event.data.object as Stripe.PaymentIntent;
      const extensionId = intent.metadata?.extensionId;
      const reservationId = intent.metadata?.reservationId;
      const chargeId =
        typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
      if (extensionId && reservationId && chargeId && intent.status === "succeeded") {
        await markExtensionPaid({ extensionId, reservationId, chargeId }).catch((extError) =>
          console.error("Extension payment_intent.succeeded apply failed", extensionId, extError),
        );
      }
      await prisma.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      return NextResponse.json({ received: true });
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
        const result = await markReservationPaidHeld({
          reservationId,
          paymentIntentId,
          chargeId: chargeId || "",
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        if (!result.ok) throw new Error(result.reason);
      }
    } else if (event.type === "payment_intent.succeeded") {
      // Safety net for the off-session (saved-card) charge path: the checkout
      // route captures the ledger synchronously, but if that response was lost
      // this makes sure the reservation still lands on PAID_HELD.
      const intent = event.data.object as Stripe.PaymentIntent;
      const reservationId = intent.metadata?.reservationId;
      if (
        reservationId &&
        intent.metadata?.kind !== "trip_extension" &&
        intent.metadata?.kind !== "security_deposit" &&
        intent.status === "succeeded"
      ) {
        const chargeId =
          typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        if (chargeId) {
          await markReservationPaidHeld({
            reservationId,
            paymentIntentId: intent.id,
            chargeId,
            amountTotal: intent.amount_received || intent.amount,
            currency: intent.currency,
          }).catch((captureError) =>
            console.error("payment_intent.succeeded capture failed", reservationId, captureError),
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

      // A trip-extension top-up failing must not touch the hire payment ledger.
      if (intent.metadata?.kind === "trip_extension") {
        await prisma.stripeWebhookEvent.create({
          data: { stripeEventId: event.id, type: event.type },
        });
        return NextResponse.json({ received: true });
      }

      // A security-deposit authorisation failing must never touch the hire
      // payment ledger — record it on the deposit fields and tell the host.
      if (intent.metadata?.kind === "security_deposit") {
        const failureMessage =
          intent.last_payment_error?.message?.slice(0, 500) || "Deposit hold failed";
        await prisma.payment.updateMany({
          where: { depositPaymentIntentId: intent.id },
          data: { depositStatus: "FAILED" },
        });
        if (reservationId) {
          const res = await prisma.reservation.findUnique({
            where: { id: reservationId },
            select: { listing: { select: { userId: true, title: true } } },
          });
          if (res) {
            await notificationService
              .notifySecurityAlert(
                res.listing.userId,
                "Security deposit hold failed",
                `The refundable deposit hold for the ${res.listing.title} trip did not go through (${failureMessage}). The trip is still confirmed; consider following up with the guest about a bond.`,
                `/reservations`,
              )
              .catch(() => undefined);
          }
        }
        await prisma.stripeWebhookEvent.create({
          data: { stripeEventId: event.id, type: event.type },
        });
        return NextResponse.json({ received: true });
      }

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
