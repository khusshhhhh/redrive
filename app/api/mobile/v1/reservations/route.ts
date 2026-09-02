import { paginationQuerySchema, reservationRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { buildBookingQuote, PRICING_POLICY_VERSION } from "@/app/libs/booking";
import { cancellationPolicySnapshot, normalizeCancellationPolicy } from "@/app/libs/cancellationPolicy";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { resolveReservationDriverRows, type ReservationDriverRow } from "@/app/libs/reservationDrivers";
import { executeIdempotent } from "@/app/libs/mobile-api/idempotency";
import { mobileError, mobileJson, mobileUnexpectedError, mobileValidationError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { resolvePickupTime } from "@/app/libs/bookingTimes";
import { timezoneForState } from "@/app/libs/timezone";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";
import { notificationService } from "@/app/services/notificationService";
import { toMobileReservation } from "@/app/services/mobileDtos";

const blockingStatuses = ["REVIEWING", "APPROVED", "ACTIVE"];
const reservationInclude = { listing: true, user: { select: { id: true, name: true, image: true } } } as const;

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  try {
    const rows = await prisma.reservation.findMany({
      where: { OR: [{ userId: auth.identity.userId }, { listing: { userId: auth.identity.userId } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: parsed.data.limit + 1,
      ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
      include: reservationInclude,
    });
    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    return mobileJson(request, { data: pageRows.map((reservation) => toMobileReservation(reservation, auth.identity.userId)), page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile reservations failed");
  }
}

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, reservationRequestSchema);
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([
    { scope: "mobile-reservation-user", identifier: auth.identity.userId, limit: 12, windowMs: 60 * 60_000 },
    { scope: "mobile-reservation-ip", identifier: getClientIp(request), limit: 30, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many booking attempts. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  return executeIdempotent({ request, actorUserId: auth.identity.userId, scope: "reservation:create", payload: parsed.data, handler: async () => {
    const renter = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { emailVerified: true, name: true } });
    if (!renter?.emailVerified) return { status: 403, body: { error: { code: "EMAIL_VERIFICATION_REQUIRED", message: "Verify your email before requesting a booking.", requestId: "idempotent" } } };
    const startDate = new Date(parsed.data.startDate);
    const endDate = new Date(parsed.data.endDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (endDate < startDate || startDate < today) return { status: 400, body: { error: { code: "INVALID_DATE_RANGE", message: "Choose a valid future date range.", requestId: "idempotent" } } };
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { id: true, title: true, userId: true, price: true, cleaningFeeOption: true, cleaningFeeAmount: true, minimumNoticeHours: true, minimumTripDays: true, maximumTripDays: true, cancellationPolicy: true, pickupWindowStart: true, pickupWindowEnd: true, timezone: true, state: true } });
    if (!listing) return { status: 404, body: { error: { code: "LISTING_NOT_FOUND", message: "That listing is no longer available.", requestId: "idempotent" } } };
    if (listing.userId === auth.identity.userId) return { status: 403, body: { error: { code: "OWN_LISTING", message: "You cannot book your own listing.", requestId: "idempotent" } } };
    const quote = buildBookingQuote({ dailyRate: listing.price, startDate, endDate, insuranceType: parsed.data.insuranceType, cleaningFee: listing.cleaningFeeOption === "YES" ? listing.cleaningFeeAmount || 0 : 0 });
    if (quote.days < listing.minimumTripDays || quote.days > listing.maximumTripDays) return { status: 400, body: { error: { code: "TRIP_LENGTH_INVALID", message: `Trip length must be between ${listing.minimumTripDays} and ${listing.maximumTripDays} days.`, requestId: "idempotent" } } };
    if (startDate.getTime() - Date.now() < listing.minimumNoticeHours * 60 * 60_000) return { status: 409, body: { error: { code: "NOTICE_REQUIRED", message: `This vehicle requires at least ${listing.minimumNoticeHours} hours notice.`, requestId: "idempotent" } } };
    const [reservationConflict, ownerBlock] = await Promise.all([
      prisma.reservation.findFirst({ where: { listingId: listing.id, status: { in: blockingStatuses }, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true } }),
      prisma.availabilityBlock.findFirst({ where: { listingId: listing.id, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true } }),
    ]);
    if (reservationConflict || ownerBlock) return { status: 409, body: { error: { code: "DATES_UNAVAILABLE", message: "Those dates are no longer available.", requestId: "idempotent" } } };

    const pickupTime = resolvePickupTime({
      requested: (parsed.data as { pickupTime?: unknown }).pickupTime,
      windowStart: listing.pickupWindowStart,
      windowEnd: listing.pickupWindowEnd,
    });
    if (!listing.timezone && listing.state) {
      await prisma.listing
        .update({ where: { id: listing.id }, data: { timezone: timezoneForState(listing.state) } })
        .catch(() => undefined);
    }

    // Named drivers. Optional during the mobile-client rollout; once provided we
    // enforce a valid Australian licence for the primary driver, same as web.
    let driverRows: ReservationDriverRow[] = [];
    if (Array.isArray(parsed.data.drivers) && parsed.data.drivers.length > 0) {
      const resolution = await resolveReservationDriverRows(auth.identity.userId, parsed.data.drivers);
      if (!resolution.ok) {
        return { status: resolution.status, body: { error: { code: resolution.code, message: resolution.error, requestId: "idempotent" } } };
      }
      driverRows = resolution.rows;
    }

    const created = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({ data: { userId: auth.identity.userId, listingId: listing.id, startDate, endDate, totalPrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee, insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, totalFees: quote.total, message: parsed.data.message || null, quoteSnapshot: quote, pricingPolicyVersion: PRICING_POLICY_VERSION, cancellationPolicy: normalizeCancellationPolicy(listing.cancellationPolicy), cancellationPolicySnapshot: cancellationPolicySnapshot(listing.cancellationPolicy), status: "REVIEWING", autoDeclineAt: new Date(Date.now() + 48 * 60 * 60_000), pickupTime, pickupTimeSetByRole: "GUEST", pickupTimeConfirmed: true, pickupTimeUpdatedAt: new Date() } });
      await tx.bookingQuote.create({ data: { userId: auth.identity.userId, listingId: listing.id, reservationId: reservation.id, startDate, endDate, days: quote.days, dailyRate: quote.dailyRate, basePrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee, insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, cleaningFee: quote.cleaningFee, total: quote.total, currency: quote.currency, policyVersion: quote.policyVersion, expiresAt: new Date(Date.now() + 15 * 60_000) } });
      if (driverRows.length > 0) {
        await tx.reservationDriver.createMany({ data: driverRows.map((driver) => ({ ...driver, reservationId: reservation.id })) });
        await tx.licenceCheck.deleteMany({ where: { frontPublicId: { in: driverRows.map((driver) => driver.licenceImagePublicId) } } });
      }
      return reservation;
    });
    await notificationService.notifyBookingRequest(listing.userId, renter.name || "Someone", listing.title, created.id).catch((error) => console.error("Booking notification failed", error));
    await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "RESERVATION_CREATED", targetType: "Reservation", targetId: created.id, metadata: { listingId: listing.id, total: quote.total } });
    const full = await prisma.reservation.findUniqueOrThrow({ where: { id: created.id }, include: reservationInclude });
    return { status: 201, body: toMobileReservation(full, auth.identity.userId) };
  } }).catch((error) => mobileUnexpectedError(request, error, "Mobile reservation create failed"));
}

export const GET = monitorApiRoute("/api/mobile/v1/reservations", GETHandler, "GET");
export const POST = monitorApiRoute("/api/mobile/v1/reservations", POSTHandler, "POST");
