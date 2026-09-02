import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";
import { postBookingSystemMessage } from "@/app/libs/systemMessages";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";
import {
  type BookingRole,
  type HandoverKind,
  combineDateAndTime,
  decideTimeChange,
  effectivePickupWindow,
  formatTimeOfDay,
  isReturnBeforePickup,
  normalizeTimeOfDay,
  ownerRole,
  withinWindow,
} from "@/app/libs/bookingTimes";
import { formatHandoverMoment } from "@/app/libs/notifications/templates";
import { resolveListingTimezone } from "@/app/libs/timezone";

type Context = { params: Promise<{ reservationId: string }> };

const PICKUP_EDITABLE = new Set(["REVIEWING", "APPROVED", "ACTIVE"]);
const HANDOVER_EDITABLE = new Set(["APPROVED", "ACTIVE"]);
const PAID = new Set(["PAID_HELD", "RELEASED"]);

/** Below this lead time every change emails; above it, rapid repeats stay in-app. */
const DEBOUNCE_WINDOW_MS = 10 * 60_000;
const EMAIL_ALWAYS_WITHIN_HOURS = 48;

function leadTimeBucket(hours: number): string {
  if (hours < 0) return "in-progress";
  if (hours < 6) return "under-6h";
  if (hours < 24) return "6-24h";
  if (hours < 72) return "1-3d";
  if (hours < 168) return "3-7d";
  return "7d-plus";
}

async function PATCHHandler(request: Request, context: Context) {
  const { reservationId } = await context.params;
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      status: true,
      paymentStatus: true,
      startDate: true,
      endDate: true,
      updatedAt: true,
      pickupTime: true,
      pickupTimeConfirmed: true,
      pickupTimeProposedByRole: true,
      pickupTimeSetByRole: true,
      pickupTimeUpdatedAt: true,
      handoverTime: true,
      handoverTimeConfirmed: true,
      handoverTimeProposedByRole: true,
      handoverTimeSetByRole: true,
      handoverTimeUpdatedAt: true,
      listing: {
        select: {
          id: true,
          userId: true,
          title: true,
          state: true,
          timezone: true,
          pickupWindowStart: true,
          pickupWindowEnd: true,
          preparationBufferHours: true,
        },
      },
    },
  });
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

  const isHost = reservation.listing.userId === user.id;
  const isGuest = reservation.userId === user.id;
  if (!isHost && !isGuest) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorRole: BookingRole = isHost ? "HOST" : "GUEST";

  const rateLimit = await consumeRateLimits([
    { scope: "reservation-times", identifier: user.id, limit: 30, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const body = await request.json().catch(() => ({}));
  const kind: HandoverKind | null =
    body.kind === "PICKUP" || body.kind === "HANDOVER" ? body.kind : null;
  if (!kind) return NextResponse.json({ error: "Choose pickup or handover" }, { status: 400 });
  const action: "SET" | "CONFIRM" = body.action === "CONFIRM" ? "CONFIRM" : "SET";

  // Optimistic-concurrency guard: the client passes the updatedAt it rendered
  // from. If the booking moved on since (another edit, a payment), 409 so the
  // UI reloads instead of silently clobbering.
  if (body.expectedUpdatedAt) {
    const expected = new Date(body.expectedUpdatedAt).getTime();
    if (Number.isFinite(expected) && expected !== reservation.updatedAt.getTime()) {
      return NextResponse.json(
        { error: "This booking changed while you were editing. Reloading the latest.", code: "STALE" },
        { status: 409 },
      );
    }
  }

  const editable = kind === "PICKUP" ? PICKUP_EDITABLE : HANDOVER_EDITABLE;
  if (!editable.has(reservation.status)) {
    return NextResponse.json(
      {
        error:
          kind === "PICKUP"
            ? "The pickup time can no longer be changed for this booking"
            : "The return time can be set once the booking is confirmed",
        code: "NOT_EDITABLE",
      },
      { status: 409 },
    );
  }
  if (kind === "HANDOVER" && !PAID.has(reservation.paymentStatus)) {
    return NextResponse.json(
      { error: "The return time can be set once payment is secured", code: "PAYMENT_REQUIRED" },
      { status: 409 },
    );
  }

  const zone = resolveListingTimezone(reservation.listing);
  const owner = ownerRole(kind);
  const currentTime = kind === "PICKUP" ? reservation.pickupTime : reservation.handoverTime;
  const currentConfirmed =
    kind === "PICKUP" ? reservation.pickupTimeConfirmed : reservation.handoverTimeConfirmed;
  const currentProposedBy =
    kind === "PICKUP" ? reservation.pickupTimeProposedByRole : reservation.handoverTimeProposedByRole;

  // --- CONFIRM: the owner accepts a pending proposal -------------------------
  if (action === "CONFIRM") {
    if (actorRole !== owner) {
      return NextResponse.json({ error: "Only the other party can confirm this time" }, { status: 403 });
    }
    if (currentConfirmed || !currentProposedBy || !currentTime) {
      return NextResponse.json({ error: "There's no proposed time to confirm" }, { status: 409 });
    }
  }

  // --- SET: validate the requested time ------------------------------------
  let time = currentTime ?? null;
  if (action === "SET") {
    const requested = normalizeTimeOfDay(body.time);
    if (!requested) return NextResponse.json({ error: "Enter a valid time" }, { status: 400 });
    time = requested;

    // The host owns the pickup window and may set a pickup outside it for a
    // one-off; a guest proposal must sit inside it. An unchanged value always
    // passes so a later-narrowed window can't trap the booking.
    if (
      kind === "PICKUP" &&
      actorRole === "GUEST" &&
      requested !== reservation.pickupTime &&
      !withinWindow(requested, reservation.listing.pickupWindowStart, reservation.listing.pickupWindowEnd)
    ) {
      const w = effectivePickupWindow(
        reservation.listing.pickupWindowStart,
        reservation.listing.pickupWindowEnd,
      );
      return NextResponse.json(
        {
          error: `Pickup needs to be between ${formatTimeOfDay(w.start)} and ${formatTimeOfDay(w.end)}. Ask the host if you need a time outside that.`,
          code: "OUTSIDE_PICKUP_WINDOW",
        },
        { status: 409 },
      );
    }

    // Same-day booking: the return can't be at/before pickup.
    const effPickup = kind === "PICKUP" ? requested : reservation.pickupTime;
    const effReturn = kind === "HANDOVER" ? requested : reservation.handoverTime;
    if (isReturnBeforePickup(reservation.startDate, reservation.endDate, effPickup, effReturn, zone)) {
      return NextResponse.json(
        { error: "On a same-day booking the return has to be after pickup", code: "RETURN_BEFORE_PICKUP" },
        { status: 409 },
      );
    }

    // Preparation buffer: if another trip on this vehicle returns just before
    // this one starts, the pickup can't be earlier than that return plus the
    // host's turnaround buffer.
    if (kind === "PICKUP") {
      const bufferMs = Math.max(0, reservation.listing.preparationBufferHours ?? 0) * 3_600_000;
      const dayStart = new Date(reservation.startDate.getTime() - 18 * 3_600_000);
      const dayEnd = new Date(reservation.startDate.getTime() + 30 * 3_600_000);
      const prior = await prisma.reservation.findFirst({
        where: {
          listingId: reservation.listing.id,
          id: { not: reservationId },
          status: { in: ["APPROVED", "ACTIVE", "COMPLETED"] },
          endDate: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { endDate: "desc" },
        select: { endDate: true, handoverTime: true },
      });
      if (prior) {
        const priorReturn = combineDateAndTime(
          prior.endDate,
          normalizeTimeOfDay(prior.handoverTime) ?? "10:00",
          zone,
        );
        const proposedPickup = combineDateAndTime(reservation.startDate, requested, zone);
        if (proposedPickup.getTime() < priorReturn.getTime() + bufferMs) {
          const earliest = new Date(priorReturn.getTime() + bufferMs);
          const earliestLabel = new Intl.DateTimeFormat("en-AU", {
            timeZone: zone,
            hour: "numeric",
            minute: "2-digit",
          }).format(earliest);
          return NextResponse.json(
            {
              error: `The vehicle is on another trip that day. The earliest pickup is about ${earliestLabel}. Pick a later time or message the host.`,
              code: "TURNAROUND_BUFFER",
            },
            { status: 409 },
          );
        }
      }
    }
  }

  if (!time) return NextResponse.json({ error: "Enter a valid time" }, { status: 400 });

  // Before the host has approved, a guest tweaking the pickup time is still
  // shaping their own request — treat it as an owner-style change (stays
  // confirmed) rather than a proposal that needs confirming.
  const preApprovalGuestPickup =
    kind === "PICKUP" && actorRole === "GUEST" && reservation.status === "REVIEWING";
  const decision = preApprovalGuestPickup
    ? ({ confirmed: true, proposedByRole: null, notifyRole: "HOST", variant: "CHANGED" } as const)
    : decideTimeChange({ kind, actorRole, action });
  const noChange =
    action === "SET" && time === currentTime && Boolean(currentConfirmed) === decision.confirmed;
  if (noChange) {
    return NextResponse.json(
      { ok: true, unchanged: true, kind, time, updatedAt: reservation.updatedAt.toISOString() },
      { status: 200 },
    );
  }

  const now = new Date();
  const prevUpdatedAt =
    kind === "PICKUP" ? reservation.pickupTimeUpdatedAt : reservation.handoverTimeUpdatedAt;
  const prevSetByRole =
    kind === "PICKUP" ? reservation.pickupTimeSetByRole : reservation.handoverTimeSetByRole;

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data:
      kind === "PICKUP"
        ? {
            pickupTime: time,
            pickupTimeConfirmed: decision.confirmed,
            pickupTimeProposedByRole: decision.proposedByRole,
            pickupTimeSetByRole: action === "SET" ? actorRole : reservation.pickupTimeSetByRole,
            pickupTimeUpdatedAt: now,
          }
        : {
            handoverTime: time,
            handoverTimeConfirmed: decision.confirmed,
            handoverTimeProposedByRole: decision.proposedByRole,
            handoverTimeSetByRole: action === "SET" ? actorRole : reservation.handoverTimeSetByRole,
            handoverTimeUpdatedAt: now,
          },
    select: { updatedAt: true },
  });

  const relevantInstant = combineDateAndTime(
    kind === "PICKUP" ? reservation.startDate : reservation.endDate,
    time,
    zone,
  );
  const hoursUntil = (relevantInstant.getTime() - now.getTime()) / 3_600_000;

  await writeAuditEvent({
    request,
    actorUserId: user.id,
    action: "RESERVATION_TIME_CHANGED",
    targetType: "Reservation",
    targetId: reservationId,
    metadata: {
      kind,
      action,
      from: currentTime ?? null,
      to: time,
      role: actorRole,
      confirmed: decision.confirmed,
      proposed: Boolean(decision.proposedByRole),
      variant: decision.variant,
      hoursUntil: Math.round(hoursUntil),
      leadTime: leadTimeBucket(hoursUntil),
    },
  });

  // Debounce: a proposal or confirmation always emails (the other side must
  // act / gets closure). A plain "changed" repeated by the same person while
  // the trip is still days off stays in-app only.
  const debounced =
    decision.variant === "CHANGED" &&
    prevSetByRole === actorRole &&
    prevUpdatedAt != null &&
    now.getTime() - new Date(prevUpdatedAt).getTime() < DEBOUNCE_WINDOW_MS &&
    hoursUntil > EMAIL_ALWAYS_WITHIN_HOURS;

  const notifyUserId = decision.notifyRole === "HOST" ? reservation.listing.userId : reservation.userId;
  await notificationService
    .notifyTripTimeChanged(notifyUserId, {
      reservationId,
      listingTitle: reservation.listing.title,
      kind,
      time,
      changedByRole: actorRole,
      variant: decision.variant,
      inAppOnly: debounced,
      updatedAtEpoch: now.getTime(),
    })
    .catch((error) => console.error("Trip-time notification failed", error));

  // Mirror it into the booking chat — the place the product tells people to
  // coordinate handovers.
  const label = kind === "PICKUP" ? "Pickup" : "Return";
  const moment = formatHandoverMoment(
    kind === "PICKUP" ? reservation.startDate : reservation.endDate,
    time,
    zone,
  );
  const whoWord = actorRole === "HOST" ? "the host" : "the guest";
  const chatText =
    decision.variant === "PROPOSED"
      ? `${label} time proposed by ${whoWord}: ${moment} — awaiting confirmation.`
      : decision.variant === "CONFIRMED"
        ? `${label} time confirmed by ${whoWord}: ${moment}.`
        : `${label} time set by ${whoWord}: ${moment}.`;
  await postBookingSystemMessage(reservation.userId, reservation.listing.userId, chatText, user.id);

  return NextResponse.json(
    {
      ok: true,
      kind,
      time,
      confirmed: decision.confirmed,
      proposed: Boolean(decision.proposedByRole),
      proposedByRole: decision.proposedByRole,
      setByRole: actorRole,
      variant: decision.variant,
      updatedAt: updated.updatedAt.toISOString(),
    },
    { status: 200 },
  );
}

export const PATCH = monitorApiRoute(
  "/api/reservations/[reservationId]/times",
  PATCHHandler,
  "PATCH",
);
