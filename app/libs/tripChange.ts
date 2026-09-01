import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { notificationService } from "@/app/services/notificationService";
import { AUTO_RELEASE_AFTER_END_HOURS } from "@/app/libs/bookingWindows";

export type ShortenApplyResult = { ok: boolean; reason?: string; refundAmount?: number };

/**
 * Apply an approved SHORTEN request: refund the guest the unused-days amount on
 * the original held charge, pull the reservation's end date in, and shrink the
 * ledger so the eventual host payout matches the shorter trip. Idempotent — a
 * second call once the row is APPLIED is a no-op success.
 */
export async function applyTripShorten(extensionId: string): Promise<ShortenApplyResult> {
  const change = await prisma.tripExtension.findUnique({ where: { id: extensionId } });
  if (!change) return { ok: false, reason: "Change request not found" };
  if (change.kind !== "SHORTEN") return { ok: false, reason: "Not a shorten request" };
  if (change.status === "APPLIED") return { ok: true, refundAmount: change.refundAmount ?? 0 };
  if (!["APPROVED", "PENDING"].includes(change.status)) {
    return { ok: false, reason: `This request is ${change.status.toLowerCase()}` };
  }

  const [reservation, payment] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: change.reservationId },
      select: {
        totalPrice: true,
        totalFees: true,
        userId: true,
        listing: { select: { userId: true, title: true } },
      },
    }),
    prisma.payment.findUnique({ where: { reservationId: change.reservationId } }),
  ]);
  if (!reservation || !payment) return { ok: false, reason: "Reservation ledger missing" };
  if (payment.status !== "PAID_HELD" || !payment.stripeChargeId) {
    return { ok: false, reason: "The trip payment is not in a refundable state" };
  }

  const refundCents = Math.max(0, change.refundAmount ?? 0);
  const ownerReductionCents = Math.max(0, -change.extraBase * 100);
  const newBaseDollars = reservation.totalPrice + change.extraBase; // extraBase is negative
  const now = new Date();

  let refundId: string | null = null;
  if (refundCents > 0) {
    try {
      const refund = await getStripe().refunds.create(
        {
          charge: payment.stripeChargeId,
          amount: refundCents,
          metadata: { reservationId: change.reservationId, extensionId, kind: "trip_shorten" },
        },
        { idempotencyKey: `reservation-${change.reservationId}-shorten-${extensionId}` },
      );
      refundId = refund.id;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "Stripe refund failed";
      console.error("Trip-shorten refund failed", extensionId, message);
      return { ok: false, reason: "The refund could not be processed — try again shortly" };
    }
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount: Math.max(0, payment.amount - refundCents),
        ownerAmount: Math.max(0, payment.ownerAmount - ownerReductionCents),
        platformAmount: Math.max(0, payment.platformAmount - (refundCents - ownerReductionCents)),
        stripeRefundId: refundId ?? payment.stripeRefundId,
        refundedAt: now,
      },
    }),
    prisma.reservation.update({
      where: { id: change.reservationId },
      data: {
        endDate: change.newEndDate,
        totalPrice: Math.max(0, newBaseDollars),
        totalFees: Math.max(0, reservation.totalFees + change.extraTotal), // extraTotal is negative
        autoReleaseAt: new Date(
          change.newEndDate.getTime() + AUTO_RELEASE_AFTER_END_HOURS * 60 * 60_000,
        ),
      },
    }),
    prisma.tripExtension.update({
      where: { id: extensionId },
      data: { status: "APPLIED", paidAt: now, stripeRefundId: refundId },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: change.requestedById,
        action: "TRIP_SHORTENED",
        targetType: "TripExtension",
        targetId: extensionId,
        metadata: {
          reservationId: change.reservationId,
          refundAmount: refundCents,
          newEndDate: change.newEndDate.toISOString(),
          refundId,
        },
      },
    }),
  ]);

  try {
    await Promise.all([
      notificationService.notifySystemUpdate(
        reservation.userId,
        "Trip shortened",
        `Your ${reservation.listing.title} trip now ends ${change.newEndDate.toLocaleDateString("en-AU")}. A refund of AU$${Math.round(refundCents / 100).toLocaleString("en-AU")} is on its way to your card.`,
        `/reservations/${change.reservationId}`,
      ),
      notificationService.notifySystemUpdate(
        reservation.listing.userId,
        "Trip shortened",
        `The ${reservation.listing.title} trip now ends ${change.newEndDate.toLocaleDateString("en-AU")}. Your payout has been adjusted for the shorter hire.`,
        `/reservations/${change.reservationId}`,
      ),
    ]);
  } catch (error) {
    console.error("Trip-shorten notification failed", error);
  }

  return { ok: true, refundAmount: refundCents };
}
