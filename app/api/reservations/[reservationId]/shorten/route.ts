import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { buildShortenQuote } from "@/app/libs/booking";
import { EXTENSION_REQUEST_TTL_HOURS, hoursFromNow } from "@/app/libs/bookingWindows";
import { calculateCancellationOutcome } from "@/app/libs/cancellationPolicy";
import { notificationService } from "@/app/services/notificationService";
import prisma from "@/app/libs/prismadb";
import { applyTripShorten } from "@/app/libs/tripChange";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

const MS_DAY = 86_400_000;
const dayCount = (start: Date, end: Date) =>
  Math.floor(
    (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / MS_DAY,
  ) + 1;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

async function loadContext(reservationId: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      status: true,
      paymentStatus: true,
      startDate: true,
      endDate: true,
      insuranceType: true,
      totalPrice: true,
      totalFees: true,
      quoteSnapshot: true,
      cancellationPolicy: true,
      listing: {
        select: {
          id: true,
          title: true,
          userId: true,
          price: true,
          minimumTripDays: true,
          instantBook: true,
          user: { select: { stripePayoutsEnabled: true } },
        },
      },
    },
  });
  if (!reservation) return null;
  const isGuest = reservation.userId === userId;
  const isHost = reservation.listing.userId === userId;
  if (!isGuest && !isHost) return null;
  return { reservation, isGuest, isHost };
}

function quoteFor(
  reservation: NonNullable<Awaited<ReturnType<typeof loadContext>>>["reservation"],
  newEnd: Date,
) {
  const snapshot = reservation.quoteSnapshot as { dailyRate?: number; days?: number } | null;
  const dailyRate = snapshot?.dailyRate || reservation.listing.price;
  const paidDays = snapshot?.days || dayCount(reservation.startDate, reservation.endDate);
  const newTotalDays = dayCount(reservation.startDate, newEnd);
  const removedDays = paidDays - newTotalDays;
  const outcome = calculateCancellationOutcome({
    policy: reservation.cancellationPolicy,
    pickupAt: reservation.endDate,
    cancelledAt: new Date(),
  });
  const refundPercentage = Number.isFinite(outcome.refundPercentage) ? outcome.refundPercentage : 0;
  const quote = buildShortenQuote({
    dailyRate,
    paidDays,
    removedDays,
    insuranceType: reservation.insuranceType,
    refundPercentage,
  });
  return { paidDays, newTotalDays, removedDays, refundPercentage, quote };
}

async function GETHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;
  const ctx = await loadContext(reservationId, currentUser.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const changes = await prisma.tripExtension.findMany({
    where: { reservationId, kind: "SHORTEN" },
    orderBy: { createdAt: "desc" },
  });

  const today = startOfToday();
  const earliestEnd = ctx.reservation.startDate > today ? ctx.reservation.startDate : today;
  const minEnd = new Date(
    ctx.reservation.startDate.getTime() + (ctx.reservation.listing.minimumTripDays - 1) * MS_DAY,
  );
  const floorEnd = earliestEnd > minEnd ? earliestEnd : minEnd;

  const url = new URL(request.url);
  const newEndParam = url.searchParams.get("newEnd");
  let preview: ReturnType<typeof quoteFor> | null = null;
  if (newEndParam) {
    const newEnd = new Date(newEndParam);
    if (!Number.isNaN(newEnd.getTime()) && newEnd < ctx.reservation.endDate && newEnd >= floorEnd) {
      preview = quoteFor(ctx.reservation, newEnd);
    }
  }

  return NextResponse.json(
    {
      currentEndDate: ctx.reservation.endDate.toISOString(),
      earliestNewEndDate: floorEnd.toISOString(),
      canRequest:
        ctx.isGuest &&
        ctx.reservation.paymentStatus === "PAID_HELD" &&
        ["APPROVED", "ACTIVE"].includes(ctx.reservation.status) &&
        ctx.reservation.endDate.getTime() > Date.now() &&
        !changes.some((c) => ["PENDING", "APPROVED"].includes(c.status)),
      preview,
      changes,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;

  const rateLimit = await consumeRateLimits([
    { scope: "shorten-user", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
    { scope: "shorten-ip", identifier: getClientIp(request), limit: 20, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const ctx = await loadContext(reservationId, currentUser.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reservation } = ctx;

  if (!ctx.isGuest) {
    return NextResponse.json({ error: "Only the guest can shorten a trip" }, { status: 403 });
  }
  if (reservation.paymentStatus !== "PAID_HELD") {
    return NextResponse.json({ error: "Only a held, paid trip can be shortened" }, { status: 409 });
  }
  if (!["APPROVED", "ACTIVE"].includes(reservation.status)) {
    return NextResponse.json({ error: "This trip can no longer be changed" }, { status: 409 });
  }
  if (reservation.endDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This trip has already ended" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const newEnd = new Date(body.newEndDate);
  if (Number.isNaN(newEnd.getTime()) || newEnd >= reservation.endDate) {
    return NextResponse.json({ error: "Choose an earlier return date" }, { status: 400 });
  }
  const today = startOfToday();
  const earliestEnd = reservation.startDate > today ? reservation.startDate : today;
  if (newEnd < earliestEnd) {
    return NextResponse.json({ error: "The new return date can't be in the past" }, { status: 400 });
  }
  const { paidDays, newTotalDays, removedDays, refundPercentage, quote } = quoteFor(reservation, newEnd);
  if (removedDays < 1) {
    return NextResponse.json({ error: "Choose an earlier return date" }, { status: 400 });
  }
  if (newTotalDays < Math.max(1, reservation.listing.minimumTripDays)) {
    return NextResponse.json(
      { error: `This vehicle needs a minimum ${reservation.listing.minimumTripDays}-day trip` },
      { status: 409 },
    );
  }

  const open = await prisma.tripExtension.findFirst({
    where: { reservationId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (open) {
    return NextResponse.json({ error: "There's already a pending change on this trip" }, { status: 409 });
  }

  const payoutsReady = reservation.listing.user.stripePayoutsEnabled === true;
  const guestCompletedTrips = await prisma.reservation.count({
    where: { userId: currentUser.id, status: "COMPLETED" },
  });
  // Returning the car early only frees the host's calendar, so auto-apply for an
  // Instant Book host or a guest with a completed trip. The host is told, not asked.
  const autoApprove =
    payoutsReady && (reservation.listing.instantBook === true || guestCompletedTrips > 0);

  const change = await prisma.tripExtension.create({
    data: {
      reservationId,
      requestedById: currentUser.id,
      kind: "SHORTEN",
      previousEndDate: reservation.endDate,
      newEndDate: newEnd,
      extraDays: -removedDays,
      extraBase: -quote.ownerReduction,
      extraInsuranceFee: -Math.round((quote.removedInsuranceFee * refundPercentage) / 100),
      extraRedriveFee: -quote.redriveFeeCredit,
      extraServiceFee: -quote.serviceFeeCredit,
      extraTotal: -quote.refundTotal,
      refundAmount: quote.refundTotal * 100,
      status: autoApprove ? "APPROVED" : "PENDING",
      respondedAt: autoApprove ? new Date() : null,
      expiresAt: hoursFromNow(EXTENSION_REQUEST_TTL_HOURS),
    },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "TRIP_SHORTEN_REQUESTED",
    targetType: "TripExtension",
    targetId: change.id,
    metadata: { reservationId, removedDays, refundTotal: quote.refundTotal, autoApprove },
  });

  if (autoApprove) {
    const result = await applyTripShorten(change.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason || "The change could not be applied", change },
        { status: 409 },
      );
    }
    return NextResponse.json({ ...change, status: "APPLIED", applied: true, refundAmount: result.refundAmount }, { status: 201 });
  }

  try {
    await notificationService.notifySystemUpdate(
      reservation.listing.userId,
      "Trip shortening requested",
      `${currentUser.name || "Your guest"} wants to return ${reservation.listing.title} ${removedDays} day${removedDays === 1 ? "" : "s"} early (new end ${newEnd.toLocaleDateString("en-AU")}). Approve to release a AU$${quote.refundTotal.toLocaleString("en-AU")} refund.`,
      `/reservations/${reservationId}`,
    );
  } catch (error) {
    console.error("Shorten request notification failed", error);
  }

  return NextResponse.json(change, { status: 201 });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/shorten", GETHandler, "GET");
export const POST = monitorApiRoute("/api/reservations/[reservationId]/shorten", POSTHandler, "POST");
