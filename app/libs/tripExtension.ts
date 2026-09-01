import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";

export type ExtensionPaidResult = { ok: boolean; reason?: string };

/**
 * Apply a paid trip extension: move the reservation's end date + totals out and
 * record the charge so its owner portion is transferred at payout release.
 * Shared by the Checkout webhook and the off-session (saved-card) charge path.
 * Idempotent — a second call once the row is PAID is a no-op success.
 */
export async function markExtensionPaid(input: {
  extensionId: string;
  reservationId: string;
  chargeId: string;
}): Promise<ExtensionPaidResult> {
  const { extensionId, reservationId, chargeId } = input;
  if (!chargeId) return { ok: false, reason: "Stripe charge id missing" };

  const extension = await prisma.tripExtension.findUnique({ where: { id: extensionId } });
  if (!extension) return { ok: false, reason: "Extension not found" };
  if (extension.reservationId !== reservationId) {
    return { ok: false, reason: "Extension does not belong to this reservation" };
  }
  if (extension.status === "PAID") return { ok: true };

  const reservationRow = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      totalPrice: true,
      totalFees: true,
      listing: { select: { title: true, userId: true } },
    },
  });
  const now = new Date();

  await prisma.$transaction([
    prisma.tripExtension.update({
      where: { id: extensionId },
      data: { status: "PAID", paidAt: now, stripeChargeId: chargeId },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: {
        endDate: extension.newEndDate,
        totalPrice: (reservationRow?.totalPrice ?? 0) + extension.extraBase,
        totalFees: (reservationRow?.totalFees ?? 0) + extension.extraTotal,
        autoReleaseAt: new Date(extension.newEndDate.getTime() + 72 * 60 * 60_000),
      },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: extension.requestedById,
        action: "TRIP_EXTENSION_PAID",
        targetType: "TripExtension",
        targetId: extensionId,
        metadata: { reservationId, amount: extension.extraTotal, chargeId },
      },
    }),
  ]);

  try {
    await notificationService.notifySystemUpdate(
      reservationRow?.listing.userId ?? extension.requestedById,
      "Trip extended",
      `The ${reservationRow?.listing.title ?? "trip"} is now booked to ${extension.newEndDate.toLocaleDateString("en-AU")}.`,
      `/reservations/${reservationId}`,
    );
  } catch (notifyError) {
    console.error("Extension-paid notification failed", notifyError);
  }
  return { ok: true };
}
