import prisma from "@/app/libs/prismadb";
import { getStripe } from "@/app/libs/stripe";

/**
 * Refundable security deposit, held as a SEPARATE manual-capture PaymentIntent
 * so it never mixes with the hire payment or the host payout.
 *
 * This whole feature is dormant until `DEPOSIT_PREAUTH_ENABLED=true` is set —
 * every function is a safe no-op without it, and without a stored
 * `depositPaymentIntentId`. Enable it only after testing the card-hold flow in
 * Stripe test mode. Card authorisations typically expire after ~7 days;
 * `reauthorizeDeposit` (run from the lifecycle cron) refreshes the hold on
 * longer trips so the initial authorisation is no longer capped to short ones.
 */
export function depositEnabled(): boolean {
  return process.env.DEPOSIT_PREAUTH_ENABLED === "true";
}

/** A card authorisation is treated as needing a refresh this many ms after it
 *  was created (Stripe lets most auths stand ~7 days). */
const REAUTH_AFTER_MS = 5 * 86_400_000;

/**
 * Called from the Stripe webhook after the hire payment succeeds. Creates an
 * off-session, manual-capture authorisation on the saved card for the listing's
 * security deposit. Requires `setup_future_usage` to have been set on the
 * Checkout Session so a payment method is on file.
 */
export async function authorizeDeposit(reservationId: string): Promise<void> {
  if (!depositEnabled()) return;
  const payment = await prisma.payment.findUnique({
    where: { reservationId },
    include: {
      reservation: {
        select: {
          startDate: true,
          endDate: true,
          listing: { select: { securityDeposit: true, depositHoldMethod: true } },
        },
      },
    },
  });
  if (!payment || payment.depositPaymentIntentId) return;

  const deposit = payment.reservation.listing.securityDeposit || 0;
  if (deposit <= 0 || payment.reservation.listing.depositHoldMethod !== "PRE_AUTH") return;

  try {
    const intent = await getStripe().paymentIntents.retrieve(payment.stripePaymentIntentId!, {
      expand: ["payment_method"],
    });
    const paymentMethod =
      typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
    const customer = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
    if (!paymentMethod) return;

    const depositIntent = await getStripe().paymentIntents.create(
      {
        amount: deposit * 100,
        currency: payment.currency,
        capture_method: "manual",
        confirm: true,
        off_session: true,
        customer: customer || undefined,
        payment_method: paymentMethod,
        metadata: { reservationId, kind: "security_deposit" },
        description: `Refundable security deposit · reservation ${reservationId}`,
      },
      { idempotencyKey: `reservation-${reservationId}-deposit-auth` },
    );

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        depositAmount: deposit * 100,
        depositPaymentIntentId: depositIntent.id,
        depositStatus: depositIntent.status === "requires_capture" ? "AUTHORIZED" : "FAILED",
      },
    });
  } catch (error) {
    console.error("Deposit authorisation failed", reservationId, error);
    await prisma.payment
      .update({ where: { id: payment.id }, data: { depositStatus: "FAILED" } })
      .catch(() => undefined);
  }
}

/**
 * Refresh a deposit hold that is getting old so a long trip stays covered.
 * Creates a fresh manual-capture authorisation on the same card, then cancels
 * the previous one. No-op unless the feature is on, the hold is AUTHORIZED and
 * old enough, and the trip still has a couple of days to run.
 */
export async function reauthorizeDeposit(reservationId: string): Promise<boolean> {
  if (!depositEnabled()) return false;
  const payment = await prisma.payment.findUnique({
    where: { reservationId },
    include: { reservation: { select: { endDate: true } } },
  });
  if (!payment?.depositPaymentIntentId || payment.depositStatus !== "AUTHORIZED") return false;
  // If the trip ends within two days the current hold will see it out.
  if (payment.reservation.endDate.getTime() - Date.now() < 2 * 86_400_000) return false;

  try {
    const current = await getStripe().paymentIntents.retrieve(payment.depositPaymentIntentId, {
      expand: ["payment_method"],
    });
    if (current.status !== "requires_capture") return false;
    if (Date.now() - current.created * 1000 < REAUTH_AFTER_MS) return false;

    const paymentMethod =
      typeof current.payment_method === "string" ? current.payment_method : current.payment_method?.id;
    const customer = typeof current.customer === "string" ? current.customer : current.customer?.id;
    if (!paymentMethod) return false;

    const fresh = await getStripe().paymentIntents.create(
      {
        amount: payment.depositAmount || current.amount,
        currency: payment.currency,
        capture_method: "manual",
        confirm: true,
        off_session: true,
        customer: customer || undefined,
        payment_method: paymentMethod,
        metadata: { reservationId, kind: "security_deposit", reauth: "true" },
        description: `Refundable security deposit (renewed) · reservation ${reservationId}`,
      },
      { idempotencyKey: `reservation-${reservationId}-deposit-reauth-${Math.floor(Date.now() / 86_400_000)}` },
    );
    if (fresh.status !== "requires_capture") {
      await getStripe().paymentIntents.cancel(fresh.id).catch(() => undefined);
      return false;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { depositPaymentIntentId: fresh.id, depositAmount: fresh.amount },
    });
    await getStripe().paymentIntents.cancel(payment.depositPaymentIntentId).catch(() => undefined);
    return true;
  } catch (error) {
    console.error("Deposit re-authorisation failed", reservationId, error);
    return false;
  }
}

/** Release the hold — called on a clean return handover / trip completion. */
export async function releaseDeposit(reservationId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { reservationId } });
  if (!payment?.depositPaymentIntentId || payment.depositStatus !== "AUTHORIZED") return;
  try {
    await getStripe().paymentIntents.cancel(payment.depositPaymentIntentId);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { depositStatus: "RELEASED" },
    });
  } catch (error) {
    console.error("Deposit release failed", reservationId, error);
  }
}

/**
 * Capture part (or all) of the held deposit — called from an incident
 * resolution with a DEPOSIT_DEDUCTION outcome. `amount` is in dollars.
 */
export async function captureDeposit(reservationId: string, amount: number): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { reservationId } });
  if (!payment?.depositPaymentIntentId || payment.depositStatus !== "AUTHORIZED") return false;
  const cents = Math.min(payment.depositAmount || 0, Math.max(1, Math.round(amount * 100)));
  try {
    await getStripe().paymentIntents.capture(payment.depositPaymentIntentId, {
      amount_to_capture: cents,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { depositStatus: "CAPTURED", depositCapturedAmount: cents },
    });
    return true;
  } catch (error) {
    console.error("Deposit capture failed", reservationId, error);
    return false;
  }
}
