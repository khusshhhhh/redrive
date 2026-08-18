import { NextResponse } from "next/server";

import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";
import { getStripe } from "@/app/libs/stripe";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

export async function POST(request: Request, context: Context) {
  const currentUser = await getCurrentUserEnhanced(request);
  if (!currentUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = await consumeRateLimits([
    { scope: "payment-checkout", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);
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
      { error: "The 24-hour payment window has expired" },
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
  if (
    reservation.payment?.status === "PAID_HELD" ||
    reservation.payment?.status === "RELEASED"
  ) {
    return NextResponse.json(
      { error: "This reservation has already been paid" },
      { status: 409 },
    );
  }

  try {
    if (reservation.payment?.stripeCheckoutSessionId) {
      const existing = await getStripe().checkout.sessions.retrieve(
        reservation.payment.stripeCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url)
        return NextResponse.json({ url: existing.url });
      if (existing.payment_status === "paid") {
        return NextResponse.json(
          {
            error:
              "Your payment is being confirmed. Refresh this page in a moment.",
          },
          { status: 409 },
        );
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

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: reservation.user.email || undefined,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: reservation.totalFees * 100,
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
      },
      success_url: `${siteUrl}/reservations/${reservationId}?payment=success`,
      cancel_url: `${siteUrl}/reservations/${reservationId}?payment=cancelled`,
    });

    await prisma.payment.upsert({
      where: { reservationId },
      create: {
        reservationId,
        renterId: reservation.userId,
        ownerId: reservation.listing.userId,
        amount: reservation.totalFees * 100,
        ownerAmount: ownerAmount * 100,
        platformAmount: platformAmount * 100,
        stripeCheckoutSessionId: session.id,
      },
      update: {
        amount: reservation.totalFees * 100,
        ownerAmount: ownerAmount * 100,
        platformAmount: platformAmount * 100,
        status: "CHECKOUT_PENDING",
        stripeCheckoutSessionId: session.id,
        failureMessage: null,
      },
    });
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
