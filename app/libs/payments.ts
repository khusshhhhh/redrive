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
          status: true,
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
  const isCancellationPayout = payment.status === "CANCELLATION_PAYOUT_PENDING"
    && payment.reservation.status === "CANCELLED"
    && Boolean(payment.cancellationPayoutAmount);
  if ((!isCancellationPayout && payment.status !== "PAID_HELD") || !payment.stripeChargeId) {
    return {
      released: false,
      reason: "The renter payment is not ready for release",
    };
  }
  if (isCancellationPayout && payment.cancellationPayoutDueAt && payment.cancellationPayoutDueAt.getTime() > Date.now()) {
    return { released: false, reason: "The cancellation payout is not due yet" };
  }
  if (!isCancellationPayout && payment.reservation.endDate.getTime() > Date.now()) {
    return { released: false, reason: "The booking period has not finished" };
  }
  if (
    !payment.owner.stripeConnectedAccountId ||
    !payment.owner.stripePayoutsEnabled
  ) {
    return { released: false, reason: "The owner payout account is not ready" };
  }

  const [returnReport, openIncident] = isCancellationPayout ? [null, null] : await Promise.all([
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
  if (!isCancellationPayout && !mutuallyAgreed)
    return {
      released: false,
      reason: "Both parties must agree to the return handover",
    };
  if (!isCancellationPayout && openIncident)
    return { released: false, reason: "An incident is still under review" };

  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: isCancellationPayout ? payment.cancellationPayoutAmount! : payment.ownerAmount,
        currency: payment.currency,
        destination: payment.owner.stripeConnectedAccountId,
        source_transaction: payment.stripeChargeId,
        transfer_group: `reservation_${reservationId}`,
        metadata: { reservationId, paymentId: payment.id },
      },
      { idempotencyKey: `reservation-${reservationId}-${isCancellationPayout ? "cancellation" : "owner"}-release` },
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
      ...(isCancellationPayout ? [prisma.reservation.update({
        where: { id: reservationId },
        data: { paymentStatus: "RELEASED" },
      })] : [prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "COMPLETED",
          paymentStatus: "RELEASED",
          completedAt: new Date(),
        },
      })]),
      prisma.auditEvent.create({
        data: {
          actorUserId: payment.ownerId,
          action: "PAYOUT_RELEASED",
          targetType: "Reservation",
          targetId: reservationId,
          metadata: {
            transferId: transfer.id,
            amount: isCancellationPayout ? payment.cancellationPayoutAmount! : payment.ownerAmount,
            currency: payment.currency,
          },
        },
      }),
    ]);
    try {
      const notifications = [notificationService.notifyPaymentReceived(
          payment.ownerId,
          (isCancellationPayout ? payment.cancellationPayoutAmount! : payment.ownerAmount) / 100,
          payment.reservation.listing.title,
          reservationId,
        )];
      if (!isCancellationPayout) notifications.push(notificationService.notifyBookingCompleted(
          payment.renterId,
          payment.reservation.listing.title,
          reservationId,
        ));
      await Promise.all(notifications);
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
