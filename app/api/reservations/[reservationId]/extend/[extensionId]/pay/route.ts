import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";
import { getStripe } from "@/app/libs/stripe";
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
      customer_email: extension.reservation.user.email || undefined,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: extension.extraTotal * 100,
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
