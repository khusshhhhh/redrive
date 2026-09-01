import { authorizeDeposit, releaseDeposit } from "@/app/libs/deposit";
import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";
import { notificationService } from "@/app/services/notificationService";

export type ReleaseResult =
  | { released: true; transferId: string }
  | { released: false; reason: string };

export type CaptureResult = { ok: boolean; reason?: string };

/**
 * Move a reservation's payment ledger to PAID_HELD once Stripe confirms the
 * guest was charged. Shared by the Checkout webhook and the off-session
 * (saved-card) charge path so the two can never drift. Idempotent: a second
 * call after the row is already PAID_HELD / RELEASED is a no-op success.
 */
export async function markReservationPaidHeld(input: {
  reservationId: string;
  paymentIntentId: string;
  chargeId: string;
  amountTotal: number | null;
  currency: string | null;
}): Promise<CaptureResult> {
  const { reservationId, paymentIntentId, chargeId } = input;
  const payment = await prisma.payment.findUnique({ where: { reservationId } });
  if (!payment) return { ok: false, reason: "No payment ledger for this reservation" };
  if (payment.status === "PAID_HELD" || payment.status === "RELEASED") {
    return { ok: true };
  }
  if (!chargeId) return { ok: false, reason: "Stripe charge id missing" };
  if (input.amountTotal != null && payment.amount !== input.amountTotal) {
    return { ok: false, reason: "Stripe amount does not match the reservation ledger" };
  }
  if (input.currency != null && input.currency !== payment.currency) {
    return { ok: false, reason: "Stripe currency does not match the reservation ledger" };
  }

  const reservationRow = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { endDate: true, confirmedAt: true },
  });
  const paidAt = new Date();
  // The return handover normally releases the payout. If it stalls, this is the
  // backstop the payouts cron uses to auto-resolve.
  const autoReleaseAt = reservationRow
    ? new Date(reservationRow.endDate.getTime() + 72 * 60 * 60_000)
    : null;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID_HELD",
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: chargeId,
        paidAt,
        failureMessage: null,
      },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentStatus: "PAID_HELD",
        paidAt,
        confirmedAt: paidAt,
        ...(autoReleaseAt ? { autoReleaseAt } : {}),
      },
    }),
    prisma.auditEvent.create({
      data: {
        actorUserId: payment.renterId,
        action: "PAYMENT_CAPTURED",
        targetType: "Reservation",
        targetId: reservationId,
        metadata: {
          paymentIntentId,
          amount: payment.amount,
          currency: payment.currency,
        },
      },
    }),
  ]);

  // Tell both sides the trip is locked in — only on the first capture.
  if (!reservationRow?.confirmedAt) {
    try {
      await Promise.all([
        notificationService.notifyBookingConfirmed(
          payment.renterId,
          "your booking",
          reservationId,
          "GUEST",
        ),
        notificationService.notifyBookingConfirmed(
          payment.ownerId,
          "your vehicle",
          reservationId,
          "HOST",
        ),
      ]);
    } catch (notifyError) {
      console.error("Booking-confirmed notification failed", notifyError);
    }
    // Pre-authorise the refundable security deposit (dormant unless
    // DEPOSIT_PREAUTH_ENABLED=true).
    await authorizeDeposit(reservationId).catch((depositError) =>
      console.error("Deposit authorisation failed", depositError),
    );
  }
  return { ok: true };
}

/**
 * Ask Stripe directly whether this reservation has been paid and, if so, move
 * the ledger to PAID_HELD. This is the self-healing path for when the
 * `checkout.session.completed` webhook is missed (common in local / sandbox
 * without Stripe CLI forwarding, or a transient webhook failure). Safe to call
 * on every page load / pay click — idempotent, and a no-op once PAID_HELD.
 */
export async function reconcileReservationPayment(
  reservationId: string,
): Promise<CaptureResult> {
  const payment = await prisma.payment.findUnique({ where: { reservationId } });
  if (!payment) return { ok: false, reason: "No payment ledger for this reservation" };
  if (payment.status === "PAID_HELD" || payment.status === "RELEASED") {
    return { ok: true };
  }

  const stripe = getStripe();

  // A hosted Checkout Session is the usual route.
  if (payment.stripeCheckoutSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
      if (session.payment_status === "paid") {
        const intentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        if (intentId) {
          const intent = await stripe.paymentIntents.retrieve(intentId, {
            expand: ["latest_charge"],
          });
          const chargeId =
            typeof intent.latest_charge === "string"
              ? intent.latest_charge
              : intent.latest_charge?.id;
          return markReservationPaidHeld({
            reservationId,
            paymentIntentId: intentId,
            chargeId: chargeId || "",
            amountTotal: session.amount_total,
            currency: session.currency,
          });
        }
      }
    } catch (error) {
      console.error("Payment reconcile via checkout session failed", reservationId, error);
    }
  }

  // The off-session (saved-card) charge may have succeeded but lost its response.
  if (payment.stripePaymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
        expand: ["latest_charge"],
      });
      if (intent.status === "succeeded") {
        const chargeId =
          typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        return markReservationPaidHeld({
          reservationId,
          paymentIntentId: intent.id,
          chargeId: chargeId || "",
          amountTotal: intent.amount_received || intent.amount,
          currency: intent.currency,
        });
      }
    } catch (error) {
      console.error("Payment reconcile via payment intent failed", reservationId, error);
    }
  }

  return { ok: false, reason: "No completed Stripe payment found yet" };
}

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
          autoReleaseAt: true,
          claimWindowEndsAt: true,
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

  // Deadlock backstop: once `autoReleaseAt` (end date + 72h) has passed and a
  // return handover has at least been started by one party, release without the
  // second acknowledgement so a host isn't held hostage by a ghosting guest. An
  // open incident always blocks; a return with nothing submitted stays held for
  // support to look at (users are chased by the lifecycle cron in the meantime).
  const returnStarted =
    returnReport?.status === "SUBMITTED" || returnReport?.status === "AGREED";
  const autoReleaseDue = Boolean(
    payment.reservation.autoReleaseAt &&
      payment.reservation.autoReleaseAt.getTime() <= Date.now(),
  );
  const autoReleased = !mutuallyAgreed && autoReleaseDue && returnStarted;

  if (!isCancellationPayout && !mutuallyAgreed && !autoReleased)
    return {
      released: false,
      reason: returnStarted
        ? "The return handover is awaiting the second confirmation"
        : "Both parties must agree to the return handover",
    };
  if (!isCancellationPayout && openIncident)
    return { released: false, reason: "An incident is still under review" };

  // Hold through the post-handover claim window so the host can inspect and
  // raise a damage claim. `autoReleased` (72h+ deadlock) skips the wait.
  if (
    !isCancellationPayout &&
    !autoReleased &&
    payment.reservation.claimWindowEndsAt &&
    payment.reservation.claimWindowEndsAt.getTime() > Date.now()
  ) {
    return { released: false, reason: "The claim window is still open" };
  }

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

    // Each paid trip extension was its own charge — transfer its owner portion
    // (the extra base) from that charge. Fees stay with Redrive.
    if (!isCancellationPayout) {
      const extensions = await prisma.tripExtension.findMany({
        where: { reservationId, status: "PAID", stripeChargeId: { not: null } },
        select: { id: true, extraBase: true, stripeChargeId: true },
      });
      for (const extension of extensions) {
        try {
          await getStripe().transfers.create(
            {
              amount: extension.extraBase * 100,
              currency: payment.currency,
              destination: payment.owner.stripeConnectedAccountId,
              source_transaction: extension.stripeChargeId!,
              transfer_group: `reservation_${reservationId}`,
              metadata: { reservationId, extensionId: extension.id },
            },
            { idempotencyKey: `reservation-${reservationId}-extension-${extension.id}-release` },
          );
        } catch (extError) {
          console.error("Extension payout transfer failed", extension.id, extError);
        }
      }
    }

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
            autoReleased,
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
      if (!isCancellationPayout) {
        notifications.push(notificationService.notifyBookingCompleted(
          payment.renterId,
          payment.reservation.listing.title,
          reservationId,
        ));
        notifications.push(notificationService.notifyReviewReminder(
          payment.reservation.listing.userId,
          payment.reservation.listing.title,
          reservationId,
          "HOST",
        ));
      }
      await Promise.all(notifications);
    } catch (error) {
      console.error("Payout notifications failed", error);
    }
    // Clean completion — release any held security deposit back to the guest.
    if (!isCancellationPayout) {
      await releaseDeposit(reservationId).catch((error) =>
        console.error("Deposit release failed", reservationId, error),
      );
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
