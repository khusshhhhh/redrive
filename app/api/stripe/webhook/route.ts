import type Stripe from "stripe";
import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID_HELD",
              stripePaymentIntentId: paymentIntentId,
              stripeChargeId: chargeId,
              paidAt: new Date(),
              failureMessage: null,
            },
          }),
          prisma.reservation.update({
            where: { id: reservationId },
            data: { paymentStatus: "PAID_HELD", paidAt: new Date() },
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
