import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { maybePublishTripReviews } from "@/app/libs/reviews";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

async function GETHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;
  const review = await prisma.guestReview.findUnique({ where: { reservationId } });
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true, listing: { select: { userId: true } } },
  });
  if (!reservation || ![reservation.userId, reservation.listing.userId].includes(currentUser.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    { review: review ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await consumeRateLimits([
    { scope: "guest-review-user", identifier: currentUser.id, limit: 15, windowMs: 60 * 60_000 },
    { scope: "guest-review-ip", identifier: getClientIp(request), limit: 30, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const { reservationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 3 || text.length > 2_000) {
    return NextResponse.json({ error: "Add a rating and a few words" }, { status: 400 });
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      userId: true,
      listingId: true,
      status: true,
      endDate: true,
      listing: { select: { userId: true } },
    },
  });
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  if (reservation.listing.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the host can review the guest" }, { status: 403 });
  }
  if (reservation.status !== "COMPLETED" || reservation.endDate > oneDayAgo) {
    return NextResponse.json(
      { error: "You can review the guest once the trip is complete" },
      { status: 403 },
    );
  }

  const existing = await prisma.guestReview.findUnique({ where: { reservationId } });
  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this guest" }, { status: 409 });
  }

  const review = await prisma.guestReview.create({
    data: {
      reservationId,
      authorId: currentUser.id,
      subjectUserId: reservation.userId,
      listingId: reservation.listingId,
      rating,
      text,
    },
  });

  await maybePublishTripReviews(reservationId).catch((error) =>
    console.error("Review publish check failed", error),
  );

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "GUEST_REVIEW_CREATED",
    targetType: "GuestReview",
    targetId: review.id,
    metadata: { reservationId, rating },
  });

  return NextResponse.json(review, { status: 201 });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/guest-review", GETHandler, "GET");
export const POST = monitorApiRoute("/api/reservations/[reservationId]/guest-review", POSTHandler, "POST");
