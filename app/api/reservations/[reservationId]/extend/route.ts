import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { buildExtensionQuote } from "@/app/libs/booking";
import { EXTENSION_REQUEST_TTL_HOURS, hoursFromNow } from "@/app/libs/bookingWindows";
import { notificationService } from "@/app/services/notificationService";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

const MS_DAY = 86_400_000;
const dayCount = (start: Date, end: Date) =>
  Math.floor(
    (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / MS_DAY,
  ) + 1;

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
      autoReleaseAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          userId: true,
          price: true,
          maximumTripDays: true,
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

async function GETHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;
  const ctx = await loadContext(reservationId, currentUser.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const newEndParam = url.searchParams.get("newEnd");

  const extensions = await prisma.tripExtension.findMany({
    where: { reservationId },
    orderBy: { createdAt: "desc" },
  });

  let quote: ReturnType<typeof buildExtensionQuote> | null = null;
  let extraDays = 0;
  if (newEndParam) {
    const newEnd = new Date(newEndParam);
    const currentEnd = ctx.reservation.endDate;
    if (!Number.isNaN(newEnd.getTime()) && newEnd > currentEnd) {
      extraDays = dayCount(currentEnd, newEnd) - 1;
      const snapshot = ctx.reservation.quoteSnapshot as { dailyRate?: number; days?: number } | null;
      const dailyRate = snapshot?.dailyRate || ctx.reservation.listing.price;
      const paidDays = snapshot?.days || dayCount(ctx.reservation.startDate, currentEnd);
      quote = buildExtensionQuote({
        dailyRate,
        paidDays,
        extraDays,
        insuranceType: ctx.reservation.insuranceType,
      });
    }
  }

  return NextResponse.json(
    {
      currentEndDate: ctx.reservation.endDate.toISOString(),
      maxNewEndDate: new Date(
        ctx.reservation.startDate.getTime() + (ctx.reservation.listing.maximumTripDays - 1) * MS_DAY,
      ).toISOString(),
      canRequest:
        ctx.isGuest &&
        ["PAID_HELD", "RELEASED"].includes(ctx.reservation.paymentStatus || "") &&
        ["APPROVED", "ACTIVE"].includes(ctx.reservation.status) &&
        !extensions.some((e) => ["PENDING", "APPROVED"].includes(e.status)),
      extraDays,
      quote,
      extensions,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;

  const rateLimit = await consumeRateLimits([
    { scope: "extend-user", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
    { scope: "extend-ip", identifier: getClientIp(request), limit: 20, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const ctx = await loadContext(reservationId, currentUser.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reservation } = ctx;

  if (!ctx.isGuest) {
    return NextResponse.json({ error: "Only the guest can request an extension" }, { status: 403 });
  }
  if (!["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "")) {
    return NextResponse.json({ error: "The trip must be paid before you can extend it" }, { status: 409 });
  }
  if (!["APPROVED", "ACTIVE"].includes(reservation.status)) {
    return NextResponse.json({ error: "This trip can no longer be extended" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const newEnd = new Date(body.newEndDate);
  if (Number.isNaN(newEnd.getTime()) || newEnd <= reservation.endDate) {
    return NextResponse.json({ error: "Choose a later return date" }, { status: 400 });
  }

  const startDate = reservation.startDate;
  const newTotalDays = dayCount(startDate, newEnd);
  if (newTotalDays > reservation.listing.maximumTripDays) {
    return NextResponse.json(
      { error: `This vehicle allows trips up to ${reservation.listing.maximumTripDays} days` },
      { status: 409 },
    );
  }

  const openExtension = await prisma.tripExtension.findFirst({
    where: { reservationId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (openExtension) {
    return NextResponse.json({ error: "There's already an extension request on this trip" }, { status: 409 });
  }

  // The extra window must be free — no other reservation or owner block.
  const windowStart = new Date(reservation.endDate.getTime() + MS_DAY);
  const [conflict, block] = await Promise.all([
    prisma.reservation.findFirst({
      where: {
        listingId: reservation.listing.id,
        id: { not: reservationId },
        status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] },
        startDate: { lte: newEnd },
        endDate: { gte: windowStart },
      },
      select: { id: true },
    }),
    prisma.availabilityBlock.findFirst({
      where: { listingId: reservation.listing.id, startDate: { lte: newEnd }, endDate: { gte: windowStart } },
      select: { id: true },
    }),
  ]);
  if (conflict || block) {
    return NextResponse.json({ error: "Those extra days aren't available", code: "DATES_UNAVAILABLE" }, { status: 409 });
  }

  const snapshot = reservation.quoteSnapshot as { dailyRate?: number; days?: number } | null;
  const dailyRate = snapshot?.dailyRate || reservation.listing.price;
  const paidDays = snapshot?.days || dayCount(startDate, reservation.endDate);
  const extraDays = newTotalDays - paidDays;
  const q = buildExtensionQuote({ dailyRate, paidDays, extraDays, insuranceType: reservation.insuranceType });

  // Auto-approve when the extra days are free and the host can be paid, if the
  // host runs Instant Book OR this guest has completed a trip before. The host
  // is told, not asked.
  const payoutsReady = reservation.listing.user.stripePayoutsEnabled === true;
  const guestCompletedTrips = await prisma.reservation.count({
    where: { userId: currentUser.id, status: "COMPLETED" },
  });
  const autoApprove =
    payoutsReady && (reservation.listing.instantBook === true || guestCompletedTrips > 0);

  const extension = await prisma.tripExtension.create({
    data: {
      reservationId,
      requestedById: currentUser.id,
      previousEndDate: reservation.endDate,
      newEndDate: newEnd,
      extraDays,
      extraBase: q.extraBase,
      extraInsuranceFee: q.extraInsuranceFee,
      extraRedriveFee: q.extraRedriveFee,
      extraServiceFee: q.extraServiceFee,
      extraTotal: q.extraTotal,
      status: autoApprove ? "APPROVED" : "PENDING",
      respondedAt: autoApprove ? new Date() : null,
      expiresAt: hoursFromNow(EXTENSION_REQUEST_TTL_HOURS),
    },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "TRIP_EXTENSION_REQUESTED",
    targetType: "TripExtension",
    targetId: extension.id,
    metadata: { reservationId, extraDays, extraTotal: q.extraTotal, autoApprove },
  });

  try {
    if (autoApprove) {
      await notificationService.notifyExtensionApproved(currentUser.id, reservation.listing.title, reservationId, extension.id, q.extraTotal);
      await notificationService.notifySystemUpdate(
        reservation.listing.userId,
        "Trip extension",
        `${currentUser.name || "Your guest"} extended the ${reservation.listing.title} trip by ${extraDays} day${extraDays === 1 ? "" : "s"} — the dates were free, so it's confirmed once they pay.`,
        `/reservations/${reservationId}`,
      );
    } else {
      await notificationService.notifyExtensionRequested(
        reservation.listing.userId,
        currentUser.name || "Your guest",
        reservation.listing.title,
        reservationId,
        extraDays,
      );
    }
  } catch (error) {
    console.error("Extension notification failed", error);
  }

  return NextResponse.json(extension, { status: 201 });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/extend", GETHandler, "GET");
export const POST = monitorApiRoute("/api/reservations/[reservationId]/extend", POSTHandler, "POST");
