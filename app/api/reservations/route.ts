import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { buildBookingQuote, PRICING_POLICY_VERSION } from "@/app/libs/booking";
import { resolvePickupTime } from "@/app/libs/bookingTimes";
import { timezoneForState } from "@/app/libs/timezone";
import { PAYMENT_WINDOW_HOURS, REQUEST_AUTO_DECLINE_HOURS, hoursFromNow } from "@/app/libs/bookingWindows";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";
import { notificationService } from "@/app/services/notificationService";
import { cancellationPolicySnapshot, normalizeCancellationPolicy } from "@/app/libs/cancellationPolicy";
import { resolveReservationDriverRows } from "@/app/libs/reservationDrivers";
import { mayRevealExactLocation } from "@/app/libs/reservationAccess";

const blockingStatuses = ["REVIEWING", "APPROVED", "ACTIVE"];

async function POSTHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimit = await consumeRateLimits([
      { scope: "reservation-user", identifier: currentUser.id, limit: 12, windowMs: 60 * 60_000 },
      { scope: "reservation-ip", identifier: getClientIp(request), limit: 30, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const renter = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { emailVerified: true, guestRatingAvg: true, guestRatingCount: true } });
    if (!renter?.emailVerified) {
      return NextResponse.json({ error: "Verify your email before requesting a booking.", code: "EMAIL_VERIFICATION_REQUIRED" }, { status: 403 });
    }

    const body = await request.json();
    const listingId = typeof body.listingId === "string" ? body.listingId : "";

    // Drivers: the primary driver (the guest by default) must have a licence
    // that reads as Australian — uploaded now, or reused from a verified profile
    // licence / a previous completed trip. A second driver is optional. Every
    // uploaded licence is validated against the short-lived LicenceCheck the
    // upload route stored, never the client's claim.
    const driverInputs = Array.isArray(body.drivers) ? body.drivers.slice(0, 2) : [];
    const driverResolution = await resolveReservationDriverRows(currentUser.id, driverInputs);
    if (!driverResolution.ok) {
      return NextResponse.json(
        { error: driverResolution.error, code: driverResolution.code },
        { status: driverResolution.status },
      );
    }
    const driverRows = driverResolution.rows;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (!listingId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json({ error: "Choose a valid vehicle and date range" }, { status: 400 });
    }
    if (message.length > 1500) {
      return NextResponse.json({ error: "Message must be 1,500 characters or fewer" }, { status: 400 });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) return NextResponse.json({ error: "Pickup date cannot be in the past" }, { status: 400 });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, userId: true, price: true, cleaningFeeOption: true, cleaningFeeAmount: true, minimumNoticeHours: true, minimumTripDays: true, maximumTripDays: true, cancellationPolicy: true, instantBook: true, pickupWindowStart: true, pickupWindowEnd: true, timezone: true, state: true, user: { select: { stripePayoutsEnabled: true } } },
    });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (listing.userId === currentUser.id) return NextResponse.json({ error: "You cannot book your own listing" }, { status: 403 });

    const quote = buildBookingQuote({ dailyRate: listing.price, startDate, endDate, insuranceType: body.insuranceType, cleaningFee: listing.cleaningFeeOption === "YES" ? listing.cleaningFeeAmount || 0 : 0 });
    if (quote.days < listing.minimumTripDays || quote.days > listing.maximumTripDays) {
      return NextResponse.json({ error: `Trip length must be between ${listing.minimumTripDays} and ${listing.maximumTripDays} days` }, { status: 400 });
    }
    if (startDate.getTime() - Date.now() < listing.minimumNoticeHours * 60 * 60_000) {
      return NextResponse.json({ error: `This vehicle requires at least ${listing.minimumNoticeHours} hours notice` }, { status: 409 });
    }

    const [reservationConflict, ownerBlock] = await Promise.all([
      prisma.reservation.findFirst({ where: { listingId, status: { in: blockingStatuses }, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true } }),
      prisma.availabilityBlock.findFirst({ where: { listingId, startDate: { lte: endDate }, endDate: { gte: startDate } }, select: { id: true } }),
    ]);
    if (reservationConflict || ownerBlock) return NextResponse.json({ error: "Those dates are no longer available", code: "DATES_UNAVAILABLE" }, { status: 409 });

    // Pickup time is confirmed with the request (the host ratifies it on
    // approval). The guest proposes one on the booking screen; a missing or
    // out-of-window value falls back to the window's opening time. The host or
    // guest can revise it later from the booking details.
    const pickupTime = resolvePickupTime({
      requested: body.pickupTime,
      windowStart: listing.pickupWindowStart,
      windowEnd: listing.pickupWindowEnd,
    });

    // Backfill the listing's timezone from its state the first time it's
    // needed, so handover-time maths and emails have a zone to work in.
    if (!listing.timezone && listing.state) {
      await prisma.listing
        .update({ where: { id: listing.id }, data: { timezone: timezoneForState(listing.state) } })
        .catch(() => undefined);
    }

    // Instant Book: the host has opted in and can receive payouts, and the guest
    // is already email- and licence-verified (checked above), so the request is
    // auto-approved and goes straight to payment. Guests with a poor track
    // record (a low average over a few host reviews) still go to manual review.
    const guestBlockedFromInstant =
      (renter.guestRatingCount ?? 0) >= 2 && (renter.guestRatingAvg ?? 5) < 3.5;
    const instant =
      listing.instantBook === true &&
      listing.user.stripePayoutsEnabled === true &&
      !guestBlockedFromInstant;

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          userId: currentUser.id, listingId, startDate, endDate,
          totalPrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee,
          insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, totalFees: quote.total,
          message: message || null, quoteSnapshot: quote, pricingPolicyVersion: PRICING_POLICY_VERSION,
          pickupTime, pickupTimeSetByRole: "GUEST", pickupTimeConfirmed: true, pickupTimeUpdatedAt: new Date(),
          cancellationPolicy: normalizeCancellationPolicy(listing.cancellationPolicy),
          cancellationPolicySnapshot: cancellationPolicySnapshot(listing.cancellationPolicy),
          ...(instant
            ? {
                status: "APPROVED",
                instantBooked: true,
                respondedAt: new Date(),
                paymentDueAt: hoursFromNow(PAYMENT_WINDOW_HOURS),
              }
            : {
                status: "REVIEWING",
                autoDeclineAt: hoursFromNow(REQUEST_AUTO_DECLINE_HOURS),
              }),
        },
      });
      await tx.bookingQuote.create({
        data: { userId: currentUser.id, listingId, reservationId: created.id, startDate, endDate, days: quote.days, dailyRate: quote.dailyRate, basePrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee, insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, cleaningFee: quote.cleaningFee, total: quote.total, currency: quote.currency, policyVersion: quote.policyVersion, expiresAt: new Date(Date.now() + 15 * 60_000) },
      });
      await tx.reservationDriver.createMany({
        data: driverRows.map((driver) => ({ ...driver, reservationId: created.id })),
      });
      await tx.licenceCheck.deleteMany({
        where: { frontPublicId: { in: driverRows.map((driver) => driver.licenceImagePublicId) } },
      });
      return created;
    });

    try {
      if (instant) {
        await notificationService.notifyBookingApproved(currentUser.id, listing.title, reservation.id);
        await notificationService.notifyPaymentRequired(currentUser.id, quote.total, listing.title, reservation.id);
        await notificationService.notifySystemUpdate(
          listing.userId,
          "Instant booking",
          `${currentUser.name || "A guest"} instant-booked your ${listing.title}. The trip is confirmed once they pay.`,
          `/reservations`,
        );
      } else {
        await notificationService.notifyBookingRequest(listing.userId, currentUser.name || "Someone", listing.title, reservation.id);
      }
    } catch (notificationError) {
      console.error("Booking notification failed", notificationError);
    }
    await writeAuditEvent({ request, actorUserId: currentUser.id, action: "RESERVATION_CREATED", targetType: "Reservation", targetId: reservation.id, metadata: { listingId, total: quote.total, instant } });
    return NextResponse.json(reservation, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error creating reservation", error);
    return NextResponse.json({ error: "Unable to create reservation" }, { status: 500 });
  }
}

async function GETHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const reservations = await prisma.reservation.findMany({
      where: { OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }] },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, number: true, image: true, profileVerified: true, createdAt: true, updatedAt: true, emailVerified: true, lastActiveAt: true } },
        listing: true,
      },
    });
    const safeReservations = reservations.map((reservation) => {
      const maySeeExactLocation = mayRevealExactLocation({
        isOwner: reservation.listing.userId === currentUser.id,
        reservationStatus: reservation.status,
        paymentStatus: reservation.paymentStatus,
        releaseRule: reservation.listing.exactLocationReleaseRule,
      });
      return {
        ...reservation,
        listing: {
          ...reservation.listing,
          address: maySeeExactLocation ? reservation.listing.address : "",
          latitude: maySeeExactLocation ? reservation.listing.latitude : null,
          longitude: maySeeExactLocation ? reservation.listing.longitude : null,
        },
      };
    });
    return NextResponse.json(safeReservations, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error fetching reservations", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export const POST = monitorApiRoute("/api/reservations", POSTHandler, "POST");

export const GET = monitorApiRoute("/api/reservations", GETHandler, "GET");
