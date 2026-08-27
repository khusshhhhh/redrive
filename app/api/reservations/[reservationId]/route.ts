import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";
import { notificationService } from "@/app/services/notificationService";
import { writeAuditEvent } from "@/app/libs/security";
import { getStripe } from "@/app/libs/stripe";
import { calculateCancellationOutcome } from "@/app/libs/cancellationPolicy";
import { renterIdentityCheck } from "@/app/libs/bookingIdentity";

// ✅ GET: Fetch reservation details with user included
async function GETHandler(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any, // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Invalid reservation ID" },
        { status: 400 },
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true, user: true }, // ✅ Include user details
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    if (
      reservation.userId !== currentUser.id &&
      reservation.listing.userId !== currentUser.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Both parties to a booking may see the identity result: the renter is
    // looking at their own licence, and the owner has to review who is asking
    // for their vehicle before approving. Nobody else can reach this route.
    const identityCheck = renterIdentityCheck(reservation.user);

    // ✅ Ensure response matches SafeReservation format
    const safeReservation = {
      ...reservation,
      renterIdentity: identityCheck,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      user: {
        id: reservation.user.id,
        name: reservation.user.name,
        email: reservation.user.email,
        number: reservation.user.number,
        image: reservation.user.image,
        profileVerified: reservation.user.profileVerified,
        createdAt: reservation.user.createdAt.toISOString(),
        updatedAt: reservation.user.updatedAt.toISOString(),
        emailVerified: reservation.user.emailVerified
          ? reservation.user.emailVerified.toISOString()
          : null,
        lastActiveAt: reservation.user.lastActiveAt
          ? reservation.user.lastActiveAt.toISOString()
          : null,
        licenseExpiresAt: reservation.user.licenseExpiresAt
          ? reservation.user.licenseExpiresAt.toISOString()
          : null,
      },
      listing: {
        ...reservation.listing,
        address:
          reservation.listing.userId === currentUser.id ||
          ["APPROVED", "ACTIVE", "COMPLETED"].includes(reservation.status)
            ? reservation.listing.address
            : "",
        latitude:
          reservation.listing.userId === currentUser.id ||
          ["APPROVED", "ACTIVE", "COMPLETED"].includes(reservation.status)
            ? reservation.listing.latitude
            : null,
        longitude:
          reservation.listing.userId === currentUser.id ||
          ["APPROVED", "ACTIVE", "COMPLETED"].includes(reservation.status)
            ? reservation.listing.longitude
            : null,
        createdAt: reservation.listing.createdAt.toISOString(),
      },
    };

    return NextResponse.json(safeReservation, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching reservation:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
// ✅ DELETE: Cancel a reservation
async function DELETEHandler(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any, // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;

    // Validate the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        listing: true,
        user: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // Ensure the user is either the one who booked or the listing owner
    if (
      reservation.userId !== currentUser.id &&
      reservation.listing.userId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Unauthorized to cancel this reservation" },
        { status: 403 },
      );
    }

    // Determine who cancelled and notify the other party
    const cancelledBy =
      currentUser.id === reservation.userId
        ? "you"
        : reservation.listing.title + " owner";
    const notifyUserId =
      currentUser.id === reservation.userId
        ? reservation.listing.userId
        : reservation.userId;

    if (["CANCELLED", "DECLINED", "COMPLETED"].includes(reservation.status)) {
      return NextResponse.json(
        { error: "This reservation can no longer be cancelled" },
        { status: 409 },
      );
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      reason =
        typeof body?.reason === "string"
          ? body.reason.trim().slice(0, 500)
          : undefined;
    } catch {
      reason = undefined;
    }

    const isOwnerCancellation = currentUser.id === reservation.listing.userId;
    const outcome = calculateCancellationOutcome({
      policy: reservation.cancellationPolicy || reservation.listing.cancellationPolicy,
      pickupAt: reservation.startDate,
      cancelledByHost: isOwnerCancellation,
    });
    if (!outcome.canCancel) {
      return NextResponse.json(
        { error: outcome.explanation, code: "TRIP_ALREADY_STARTED" },
        { status: 409 },
      );
    }

    const refundAmount = ["PAID_HELD", "RELEASED"].includes(
      reservation.paymentStatus,
    )
      ? Math.round(reservation.totalFees * outcome.refundPercentage / 100)
      : 0;

    const payment = await prisma.payment.findUnique({
      where: { reservationId },
    });
    const cancellationPayoutAmount = payment && !isOwnerCancellation
      ? Math.max(0, Math.round(payment.ownerAmount * (100 - outcome.refundPercentage) / 100))
      : 0;
    if (refundAmount > 0) {
      if (!payment?.stripePaymentIntentId || payment.status === "RELEASED") {
        return NextResponse.json(
          {
            error:
              payment?.status === "RELEASED"
                ? "Contact support because this payout has already been released"
                : "Payment details are not ready for an automatic refund",
          },
          { status: 409 },
        );
      }
      try {
        const refund = await getStripe().refunds.create(
          {
            payment_intent: payment.stripePaymentIntentId,
            amount: refundAmount * 100,
            metadata: { reservationId, cancelledById: currentUser.id },
          },
          {
            idempotencyKey: `reservation-${reservationId}-cancellation-refund`,
          },
        );
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status:
              refundAmount === reservation.totalFees
                ? "REFUNDED"
                : cancellationPayoutAmount > 0
                  ? "CANCELLATION_PAYOUT_PENDING"
                  : "PARTIALLY_REFUNDED",
            stripeRefundId: refund.id,
            refundedAt: new Date(),
            cancellationPayoutAmount: cancellationPayoutAmount || null,
            cancellationPayoutDueAt: cancellationPayoutAmount > 0 ? reservation.startDate : null,
          },
        });
      } catch (error) {
        console.error("Stripe cancellation refund failed", error);
        return NextResponse.json(
          {
            error:
              "The refund could not be confirmed, so the booking was not cancelled",
          },
          { status: 503 },
        );
      }
    } else if (payment?.status === "PAID_HELD" && cancellationPayoutAmount > 0) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CANCELLATION_PAYOUT_PENDING",
          cancellationPayoutAmount,
          cancellationPayoutDueAt: reservation.startDate,
        },
      });
    } else if (
      payment?.stripeCheckoutSessionId &&
      payment.status === "CHECKOUT_PENDING"
    ) {
      try {
        await getStripe().checkout.sessions.expire(
          payment.stripeCheckoutSessionId,
        );
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
      } catch {
        /* The session may already be expired. */
      }
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: currentUser.id,
        cancellationReason: reason || null,
        refundAmount,
        refundPercentage: outcome.refundPercentage,
        paymentStatus:
          cancellationPayoutAmount > 0
            ? "CANCELLATION_PAYOUT_PENDING"
            : refundAmount > 0
            ? refundAmount === reservation.totalFees
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED"
            : reservation.paymentStatus,
      },
    });

    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "RESERVATION_CANCELLED",
      targetType: "Reservation",
      targetId: reservation.id,
      reason,
      metadata: { refundAmount, refundPercentage: outcome.refundPercentage, cancellationPolicy: outcome.policy.key },
    });

    // Send cancellation notification
    try {
      await notificationService.notifyBookingCancelled(
        notifyUserId,
        reservation.listing.title,
        reservation.id,
        cancelledBy,
      );
    } catch (notificationError) {
      console.error(
        "Error sending cancellation notification:",
        notificationError,
      );
      // Don't fail the cancellation if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reservation cancelled",
        refundAmount,
        refundPercentage: outcome.refundPercentage,
        cancellationPolicy: outcome.policy.key,
        explanation: outcome.explanation,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error canceling reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH: update reservation status
async function PATCHHandler(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await context.params;
    const body = await request.json();
    const status =
      typeof body.status === "string" ? body.status.toUpperCase() : "";

    if (!reservationId || !status) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        listing: true,
        user: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    if (reservation.listing.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transitions: Record<string, string[]> = {
      REVIEWING: ["APPROVED", "DECLINED"],
    };
    if (!transitions[reservation.status]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot change ${reservation.status} reservation to ${status}`,
        },
        { status: 409 },
      );
    }

    if (status === "APPROVED") {
      const owner = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { stripeConnectedAccountId: true, stripePayoutsEnabled: true },
      });
      let payoutsEnabled = Boolean(owner?.stripePayoutsEnabled);
      if (owner?.stripeConnectedAccountId) {
        try {
          const account = await getStripe().accounts.retrieve(
            owner.stripeConnectedAccountId,
          );
          payoutsEnabled =
            account.payouts_enabled &&
            account.capabilities?.transfers === "active";
          await prisma.user.update({
            where: { id: currentUser.id },
            data: {
              stripeDetailsSubmitted: account.details_submitted,
              stripePayoutsEnabled: payoutsEnabled,
            },
          });
        } catch (error) {
          console.error("Unable to verify host payout account", error);
          return NextResponse.json(
            { error: "Payout setup could not be verified. Try again shortly." },
            { status: 503 },
          );
        }
      }
      if (!payoutsEnabled)
        return NextResponse.json(
          {
            error:
              "Set up and verify your Stripe payout account before approving bookings",
            code: "PAYOUT_SETUP_REQUIRED",
          },
          { status: 409 },
        );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status,
        ...(reservation.status === "REVIEWING" &&
        ["APPROVED", "DECLINED"].includes(status)
          ? {
              respondedAt: new Date(),
              ...(status === "APPROVED"
                ? { paymentDueAt: new Date(Date.now() + 24 * 60 * 60_000) }
                : {}),
            }
          : {}),
      },
    });

    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "RESERVATION_STATUS_CHANGED",
      targetType: "Reservation",
      targetId: reservation.id,
      metadata: { from: reservation.status, to: status },
    });

    // Send notification based on status change
    try {
      if (status === "APPROVED") {
        await notificationService.notifyBookingApproved(
          reservation.userId,
          reservation.listing.title,
          reservation.id,
        );
        await notificationService.notifyPaymentRequired(
          reservation.userId,
          reservation.totalFees,
          reservation.listing.title,
          reservation.id,
        );
      } else if (status === "DECLINED") {
        await notificationService.notifyBookingDeclined(
          reservation.userId,
          reservation.listing.title,
          reservation.id,
        );
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't fail the reservation update if notification fails
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]", GETHandler, "GET");

export const DELETE = monitorApiRoute("/api/reservations/[reservationId]", DELETEHandler, "DELETE");

export const PATCH = monitorApiRoute("/api/reservations/[reservationId]", PATCHHandler, "PATCH");
