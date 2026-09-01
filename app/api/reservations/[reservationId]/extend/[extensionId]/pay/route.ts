import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { markExtensionPaid } from "@/app/libs/tripExtension";
import { siteUrl } from "@/app/libs/siteUrl";
import { getStripe } from "@/app/libs/stripe";
import { getOrCreateStripeCustomer } from "@/app/libs/stripeCustomer";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string; extensionId: string }> };

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId, extensionId } = await context.params;

  const rateLimit = await consumeRateLimits([
    { scope: "extend-pay", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

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

  const extension = await prisma.tripExtension.findUnique({
    where: { id: extensionId },
    include: {
      reservation: {
        select: {
          userId: true,
          status: true,
          paymentStatus: true,
          user: { select: { email: true } },
          listing: {
            select: {
              title: true,
              imageSrcs: true,
              userId: true,
              user: { select: { stripeConnectedAccountId: true, stripePayoutsEnabled: true } },
            },
          },
        },
      },
    },
  });
  if (!extension || extension.reservationId !== reservationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (extension.reservation.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the guest can pay" }, { status: 403 });
  }
  if (extension.status === "PAID") {
    return NextResponse.json({ error: "This extension is already paid" }, { status: 409 });
  }
  if (extension.status !== "APPROVED") {
    return NextResponse.json({ error: "This extension hasn't been approved yet" }, { status: 409 });
  }
  if (extension.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This extension request has expired — ask again" }, { status: 409 });
  }
  if (!extension.reservation.listing.user.stripePayoutsEnabled) {
    return NextResponse.json({ error: "The host's payout account isn't ready" }, { status: 409 });
  }
  if (extension.extraTotal < 50) {
    return NextResponse.json({ error: "The extension amount is too small to charge" }, { status: 409 });
  }

  const amountCents = extension.extraTotal * 100;
  const customerId = await getOrCreateStripeCustomer(currentUser.id);

  // --- Path A: charge a saved card off-session, no redirect -----------------
  if (savedPaymentMethodId && customerId) {
    try {
      const method = await getStripe().paymentMethods.retrieve(savedPaymentMethodId);
      if (method.customer !== customerId) {
        return NextResponse.json({ error: "That card is not on your account" }, { status: 403 });
      }
      const intent = await getStripe().paymentIntents.create({
        amount: amountCents,
        currency: "aud",
        customer: customerId,
        payment_method: savedPaymentMethodId,
        payment_method_types: ["card"],
        off_session: true,
        confirm: true,
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, extensionId, kind: "trip_extension" },
      });
      if (intent.status === "succeeded") {
        const chargeId =
          typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
        const result = await markExtensionPaid({ extensionId, reservationId, chargeId: chargeId || "" });
        if (!result.ok) {
          console.error("Saved-card extension apply mismatch", extensionId, result.reason);
          return NextResponse.json(
            { error: "Your card was charged but the extension needs a moment to apply. Refresh shortly." },
            { status: 202 },
          );
        }
        await writeAuditEvent({
          request,
          actorUserId: currentUser.id,
          action: "TRIP_EXTENSION_CHECKOUT_CREATED",
          targetType: "TripExtension",
          targetId: extensionId,
          metadata: { amount: extension.extraTotal, savedCard: "true" },
        });
        return NextResponse.json({ paid: true });
      }
      // requires_action — fall through to hosted checkout.
    } catch (error) {
      const stripeErr = error as Stripe.errors.StripeError;
      console.warn(
        "Saved-card extension charge could not complete, falling back to hosted checkout",
        stripeErr?.code || stripeErr?.message,
      );
    }
  }

  // --- Path B: hosted Stripe Checkout -------------------------------------
  try {
    if (extension.stripeCheckoutSessionId) {
      const existing = await getStripe().checkout.sessions.retrieve(extension.stripeCheckoutSessionId);
      if (existing.status === "open" && existing.url) return NextResponse.json({ url: existing.url });
      if (existing.payment_status === "paid") {
        return NextResponse.json({ error: "Your payment is being confirmed. Refresh in a moment." }, { status: 409 });
      }
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      ...(customerId
        ? { customer: customerId }
        : { customer_email: extension.reservation.user.email || undefined }),
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: `Trip extension · ${extension.reservation.listing.title}`,
              description: `${extension.extraDays} extra day${extension.extraDays === 1 ? "" : "s"}. Held by Redrive until the return handover is agreed.`,
              images: extension.reservation.listing.imageSrcs[0]?.startsWith("https://")
                ? [extension.reservation.listing.imageSrcs[0]]
                : undefined,
            },
          },
        },
      ],
      metadata: { reservationId, extensionId, kind: "trip_extension" },
      payment_intent_data: {
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, extensionId, kind: "trip_extension" },
        ...(customerId ? { setup_future_usage: "off_session" as const } : {}),
      },
      success_url: `${siteUrl}/reservations/${reservationId}?extension=paid`,
      cancel_url: `${siteUrl}/reservations/${reservationId}?extension=cancelled`,
    });

    await prisma.tripExtension.update({
      where: { id: extensionId },
      data: { stripeCheckoutSessionId: session.id },
    });
    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "TRIP_EXTENSION_CHECKOUT_CREATED",
      targetType: "TripExtension",
      targetId: extensionId,
      metadata: { amount: extension.extraTotal },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Extension checkout failed", error);
    return NextResponse.json({ error: "Secure checkout could not be started" }, { status: 503 });
  }
}

export const POST = monitorApiRoute(
  "/api/reservations/[reservationId]/extend/[extensionId]/pay",
  POSTHandler,
  "POST",
);
