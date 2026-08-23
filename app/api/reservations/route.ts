import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { hasCurrentVerifiedLicense } from "@/app/libs/licenseVerification";
import { buildBookingQuote, PRICING_POLICY_VERSION } from "@/app/libs/booking";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";
import { notificationService } from "@/app/services/notificationService";
import { cancellationPolicySnapshot, normalizeCancellationPolicy } from "@/app/libs/cancellationPolicy";

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

    const renter = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { emailVerified: true, licenseStatus: true, licenseExpiresAt: true } });
    if (!renter?.emailVerified) {
      return NextResponse.json({ error: "Verify your email before requesting a booking.", code: "EMAIL_VERIFICATION_REQUIRED" }, { status: 403 });
    }
    if (!hasCurrentVerifiedLicense(renter?.licenseStatus, renter?.licenseExpiresAt)) {
      return NextResponse.json({ error: "A checked, current Australian driver licence is required before requesting a booking.", code: "LICENSE_NOT_VERIFIED" }, { status: 403 });
    }

    const body = await request.json();
    const listingId = typeof body.listingId === "string" ? body.listingId : "";
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
      select: { id: true, title: true, userId: true, price: true, cleaningFeeOption: true, cleaningFeeAmount: true, minimumNoticeHours: true, minimumTripDays: true, maximumTripDays: true, cancellationPolicy: true },
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

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: { userId: currentUser.id, listingId, startDate, endDate, totalPrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee, insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, totalFees: quote.total, message: message || null, quoteSnapshot: quote, pricingPolicyVersion: PRICING_POLICY_VERSION, cancellationPolicy: normalizeCancellationPolicy(listing.cancellationPolicy), cancellationPolicySnapshot: cancellationPolicySnapshot(listing.cancellationPolicy), status: "REVIEWING" },
      });
      await tx.bookingQuote.create({
        data: { userId: currentUser.id, listingId, reservationId: created.id, startDate, endDate, days: quote.days, dailyRate: quote.dailyRate, basePrice: quote.basePrice, redriveFee: quote.redriveFee, serviceFee: quote.serviceFee, insuranceType: quote.insuranceType, insuranceFee: quote.insuranceFee, cleaningFee: quote.cleaningFee, total: quote.total, currency: quote.currency, policyVersion: quote.policyVersion, expiresAt: new Date(Date.now() + 15 * 60_000) },
      });
      return created;
    });

    try {
      await notificationService.notifyBookingRequest(listing.userId, currentUser.name || "Someone", listing.title, reservation.id);
    } catch (notificationError) {
      console.error("Booking notification failed", notificationError);
    }
    await writeAuditEvent({ request, actorUserId: currentUser.id, action: "RESERVATION_CREATED", targetType: "Reservation", targetId: reservation.id, metadata: { listingId, total: quote.total } });
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
      const maySeeExactLocation = reservation.listing.userId === currentUser.id
        || ["APPROVED", "ACTIVE", "COMPLETED"].includes(reservation.status);
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
