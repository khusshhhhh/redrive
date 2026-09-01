import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { PAYMENT_WINDOW_HOURS } from "@/app/libs/bookingWindows";
import prisma from "@/app/libs/prismadb";
import { markReservationPaidHeld, reconcileReservationPayment } from "@/app/libs/payments";
import { siteUrl } from "@/app/libs/siteUrl";
import { getStripe } from "@/app/libs/stripe";
import { getOrCreateStripeCustomer } from "@/app/libs/stripeCustomer";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUserEnhanced(request);
  if (!currentUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = await consumeRateLimits([
    { scope: "payment-checkout", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  // Optional: pay with a card already on file (no redirect to Stripe).
  let savedPaymentMethodId = "";
  try {
    const body = await request.json();
    if (body && typeof body.paymentMethodId === "string") {
      savedPaymentMethodId = body.paymentMethodId.trim();
    }
  } catch {
    // no body — hosted checkout
  }
  if (savedPaymentMethodId && !savedPaymentMethodId.startsWith("pm_")) {
    return NextResponse.json({ error: "Invalid saved card" }, { status: 400 });
  }

  const { reservationId } = await context.params;
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      listing: {
        select: {
          title: true,
          userId: true,
          imageSrcs: true,
          user: {
            select: {
              stripeConnectedAccountId: true,
              stripePayoutsEnabled: true,
            },
          },
        },
      },
      user: { select: { email: true } },
      payment: true,
    },
  });
  if (!reservation)
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  if (reservation.userId !== currentUser.id)
    return NextResponse.json(
      { error: "Only the renter can pay" },
      { status: 403 },
    );
  if (reservation.status !== "APPROVED")
    return NextResponse.json(
      { error: "This reservation is not ready for payment" },
      { status: 409 },
    );
  if (
    reservation.paymentDueAt &&
    reservation.paymentDueAt.getTime() <= Date.now()
  )
    return NextResponse.json(
      { error: `The ${PAYMENT_WINDOW_HOURS}-hour payment window has expired` },
      { status: 409 },
    );
  if (
    !reservation.listing.user.stripeConnectedAccountId ||
    !reservation.listing.user.stripePayoutsEnabled
  ) {
    return NextResponse.json(
      {
        error:
          "The host must finish payout setup before payment can be accepted",
      },
      { status: 409 },
    );
  }
  // If a previous attempt already went through on Stripe but the webhook was
  // missed, catch up here so a second "Pay" click finalises the booking instead
  // of looping on an error.
  if (reservation.payment) {
    const reconcile = await reconcileReservationPayment(reservationId);
    if (reconcile.ok) {
      return NextResponse.json({ paid: true });
    }
  }

  const quote = reservation.quoteSnapshot as { cleaningFee?: number } | null;
  const ownerAmount =
    reservation.totalPrice + Math.max(0, Math.round(quote?.cleaningFee || 0));
  const platformAmount = reservation.totalFees - ownerAmount;
  if (reservation.totalFees < 50 || ownerAmount <= 0 || platformAmount < 0) {
    return NextResponse.json(
      { error: "The saved booking total is invalid" },
      { status: 409 },
    );
  }
  const amountCents = reservation.totalFees * 100;

  // A guest-side Stripe Customer so the card entered now is saved for the next
  // booking or a trip extension. Null only if Stripe itself failed.
  const customerId = await getOrCreateStripeCustomer(currentUser.id);

  const ensurePaymentRow = (extra: Record<string, unknown>) =>
    prisma.payment.upsert({
      where: { reservationId },
      create: {
        reservationId,
        renterId: reservation.userId,
        ownerId: reservation.listing.userId,
        amount: amountCents,
        ownerAmount: ownerAmount * 100,
        platformAmount: platformAmount * 100,
        ...extra,
      },
      update: {
        amount: amountCents,
        ownerAmount: ownerAmount * 100,
        platformAmount: platformAmount * 100,
        status: "CHECKOUT_PENDING",
        failureMessage: null,
        ...extra,
      },
    });

  // --- Path A: charge a saved card off-session, no redirect ------------------
  if (savedPaymentMethodId && customerId) {
    try {
      const method = await getStripe().paymentMethods.retrieve(savedPaymentMethodId);
      if (method.customer !== customerId) {
        return NextResponse.json({ error: "That card is not on your account" }, { status: 403 });
      }

      await ensurePaymentRow({});
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { paymentStatus: "CHECKOUT_PENDING" },
      });

      const intent = await getStripe().paymentIntents.create({
        amount: amountCents,
        currency: "aud",
        customer: customerId,
        payment_method: savedPaymentMethodId,
        payment_method_types: ["card"],
        off_session: true,
        confirm: true,
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, ownerId: reservation.listing.userId },
      });

      if (intent.status === "succeeded") {
        const chargeId =
          typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        await prisma.payment.update({
          where: { reservationId },
          data: { stripePaymentIntentId: intent.id },
        });
        const result = await markReservationPaidHeld({
          reservationId,
          paymentIntentId: intent.id,
          chargeId: chargeId || "",
          amountTotal: amountCents,
          currency: "aud",
        });
        if (!result.ok) {
          console.error("Saved-card capture ledger mismatch", reservationId, result.reason);
          return NextResponse.json(
            { error: "Your card was charged but the booking needs a moment to confirm. Refresh shortly." },
            { status: 202 },
          );
        }
        await writeAuditEvent({
          request,
          actorUserId: currentUser.id,
          action: "PAYMENT_CHECKOUT_CREATED",
          targetType: "Reservation",
          targetId: reservationId,
          metadata: { amount: reservation.totalFees, currency: "AUD", savedCard: "true" },
        });
        return NextResponse.json({ paid: true });
      }
      // requires_action / requires_payment_method — fall through to hosted checkout.
    } catch (error) {
      const stripeErr = error as Stripe.errors.StripeError;
      console.warn(
        "Saved-card charge could not complete, falling back to hosted checkout",
        stripeErr?.code || stripeErr?.message,
      );
      // fall through to hosted checkout below
    }
  }

  // --- Path B: hosted Stripe Checkout --------------------------------------
  try {
    if (reservation.payment?.stripeCheckoutSessionId) {
      const existing = await getStripe().checkout.sessions.retrieve(
        reservation.payment.stripeCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url)
        return NextResponse.json({ url: existing.url });
      if (existing.payment_status === "paid") {
        const reconcile = await reconcileReservationPayment(reservationId);
        if (reconcile.ok) return NextResponse.json({ paid: true });
        return NextResponse.json(
          {
            error:
              "Your payment is being confirmed. Refresh this page in a moment.",
          },
          { status: 409 },
        );
      }
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      ...(customerId
        ? { customer: customerId }
        : { customer_email: reservation.user.email || undefined }),
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: `Vehicle hire · ${reservation.listing.title}`,
              description:
                "Funds are held by Redrive until the return handover is agreed.",
              images: reservation.listing.imageSrcs[0]?.startsWith("https://")
                ? [reservation.listing.imageSrcs[0]]
                : undefined,
            },
          },
        },
      ],
      metadata: { reservationId },
      payment_intent_data: {
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, ownerId: reservation.listing.userId },
        // Keep the card on file for the next booking / extension.
        ...(customerId ? { setup_future_usage: "off_session" as const } : {}),
      },
      success_url: `${siteUrl}/reservations/${reservationId}?payment=success`,
      cancel_url: `${siteUrl}/reservations/${reservationId}?payment=cancelled`,
    });

    await ensurePaymentRow({ stripeCheckoutSessionId: session.id });
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { paymentStatus: "CHECKOUT_PENDING" },
    });
    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "PAYMENT_CHECKOUT_CREATED",
      targetType: "Reservation",
      targetId: reservationId,
      metadata: { amount: reservation.totalFees, currency: "AUD" },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout creation failed", error);
    return NextResponse.json(
      { error: "Secure checkout could not be started" },
      { status: 503 },
    );
  }
}

/**
 * Poll Stripe for a payment the webhook may have missed and finalise it.
 * Called by the reservation page after a hosted-checkout return and once on a
 * plain load while a payment is still pending.
 */
async function GETHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUserEnhanced(request);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true },
  });
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  if (reservation.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the renter can check this" }, { status: 403 });
  }

  const result = await reconcileReservationPayment(reservationId);
  const fresh = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { status: true, paymentStatus: true },
  });
  return NextResponse.json(
    {
      reconciled: result.ok,
      status: fresh?.status ?? null,
      paymentStatus: fresh?.paymentStatus ?? null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/checkout", GETHandler, "GET");
export const POST = monitorApiRoute("/api/reservations/[reservationId]/checkout", POSTHandler, "POST");
