import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { notificationService } from "@/app/services/notificationService";

export type ReleaseResult =
  | { released: true; transferId: string }
  | { released: false; reason: string };

export async function releaseReservationPayment(
  reservationId: string,
): Promise<ReleaseResult> {
  const payment = await prisma.payment.findUnique({
    where: { reservationId },
    include: {
      owner: {
        select: { stripeConnectedAccountId: true, stripePayoutsEnabled: true },
      },
      reservation: {
        select: {
          endDate: true,
          userId: true,
          listing: { select: { userId: true, title: true } },
        },
      },
    },
  });

  if (!payment)
    return {
      released: false,
      reason: "No payment exists for this reservation",
    };
  if (payment.status === "RELEASED" && payment.stripeTransferId) {
    return { released: true, transferId: payment.stripeTransferId };
  }
  if (payment.status !== "PAID_HELD" || !payment.stripeChargeId) {
    return {
      released: false,
      reason: "The renter payment is not ready for release",
    };
  }
  if (payment.reservation.endDate.getTime() > Date.now()) {
    return { released: false, reason: "The booking period has not finished" };
  }
  if (
    !payment.owner.stripeConnectedAccountId ||
    !payment.owner.stripePayoutsEnabled
  ) {
    return { released: false, reason: "The owner payout account is not ready" };
  }

  const [returnReport, openIncident] = await Promise.all([
    prisma.handoverReport.findUnique({
      where: { reservationId_phase: { reservationId, phase: "RETURN" } },
      select: { status: true, acknowledgedByIds: true },
    }),
    prisma.incidentCase.findFirst({
      where: { reservationId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
      select: { id: true },
    }),
  ]);

  const requiredAcknowledgements = [
    payment.reservation.userId,
    payment.reservation.listing.userId,
  ];
  const mutuallyAgreed =
    returnReport?.status === "AGREED" &&
    requiredAcknowledgements.every((id) =>
      returnReport.acknowledgedByIds.includes(id),
    );
  if (!mutuallyAgreed)
    return {
      released: false,
      reason: "Both parties must agree to the return handover",
    };
  if (openIncident)
    return { released: false, reason: "An incident is still under review" };

  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: payment.ownerAmount,
        currency: payment.currency,
        destination: payment.owner.stripeConnectedAccountId,
        source_transaction: payment.stripeChargeId,
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, paymentId: payment.id },
      },
      { idempotencyKey: `reservation-${reservationId}-owner-release` },
    );

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "RELEASED",
          stripeTransferId: transfer.id,
          releasedAt: new Date(),
          failureMessage: null,
        },
      }),
      prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "COMPLETED",
          paymentStatus: "RELEASED",
          completedAt: new Date(),
        },
      }),
      prisma.auditEvent.create({
        data: {
          actorUserId: payment.ownerId,
          action: "PAYOUT_RELEASED",
          targetType: "Reservation",
          targetId: reservationId,
          metadata: {
            transferId: transfer.id,
            amount: payment.ownerAmount,
            currency: payment.currency,
          },
        },
      }),
    ]);
    try {
      await Promise.all([
        notificationService.notifyPaymentReceived(
          payment.ownerId,
          payment.ownerAmount / 100,
          payment.reservation.listing.title,
          reservationId,
        ),
        notificationService.notifyBookingCompleted(
          payment.renterId,
          payment.reservation.listing.title,
          reservationId,
        ),
      ]);
    } catch (error) {
      console.error("Payout notifications failed", error);
    }
    return { released: true, transferId: transfer.id };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Stripe transfer failed";
    await prisma.payment.update({
      where: { id: payment.id },
      data: { failureMessage: message },
    });
    return {
      released: false,
      reason: "Stripe could not release the payout yet",
    };
  }
}
