import { guestDailyPrice, redriveMargin } from "@/app/libs/pricing";

// The price primitives (the guest-facing daily price, Redrive's margin) live in
// `pricing.ts` so the booking panel, the listing page, the home-page estimator
// and the server quote can never disagree. This module adds the parts that are
// specific to a real booking: protection, cleaning and the policy version.
//
// `totalPrice` on a reservation is always the *host* base (dailyRate × days) —
// it drives the host payout. `totalFees` is what the guest pays: the guest base
// (host rate + margin) plus protection and cleaning. Redrive's margin is the
// implicit difference and is never shown to the guest.
export const PRICING_POLICY_VERSION = "2026-09-10";

const insuranceDailyRates: Record<string, number> = {
  "No Insurance": 0,
  "Risk Taker": 20,
  "Happy Driver": 40,
};

export function insuranceDailyRate(insuranceType?: string | null): number {
  return insuranceType && insuranceType in insuranceDailyRates ? insuranceDailyRates[insuranceType] : 0;
}

function inclusiveDays(startDate: Date, endDate: Date) {
  return Math.floor((Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    - Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) / 86_400_000) + 1;
}

export function buildBookingQuote(input: {
  dailyRate: number;
  startDate: Date;
  endDate: Date;
  insuranceType?: string;
  cleaningFee?: number;
}) {
  const days = inclusiveDays(input.startDate, input.endDate);
  const insuranceType = input.insuranceType && input.insuranceType in insuranceDailyRates
    ? input.insuranceType
    : "No Insurance";

  const hostDailyRate = input.dailyRate;
  const guestDailyRate = guestDailyPrice(hostDailyRate);
  const hostBase = hostDailyRate * days;
  const guestBase = guestDailyRate * days;
  const margin = guestBase - hostBase;

  const insuranceFee = insuranceDailyRates[insuranceType] * days;
  const cleaningFee = Math.max(0, Math.round(input.cleaningFee || 0));

  return {
    days,
    hostDailyRate,
    guestDailyRate,
    hostBase,
    guestBase,
    margin,
    insuranceType,
    insuranceFee,
    cleaningFee,
    // What the guest pays.
    total: guestBase + insuranceFee + cleaningFee,
    currency: "AUD",
    policyVersion: PRICING_POLICY_VERSION,
  };
}

/**
 * The cost of moving a paid trip's end date out by `extraDays`. The guest pays
 * the guest daily price for the extra days plus any extra protection; the host
 * is paid the host rate for those days (`extraHostBase`). Redrive's margin on
 * the extra days is the implicit difference.
 */
export function buildExtensionQuote(input: {
  dailyRate: number;
  paidDays: number;
  extraDays: number;
  insuranceType?: string | null;
}) {
  const extraHostBase = input.dailyRate * input.extraDays;
  const extraGuestBase = guestDailyPrice(input.dailyRate) * input.extraDays;
  const extraMargin = redriveMargin(input.dailyRate, input.extraDays);
  const extraInsuranceFee = insuranceDailyRate(input.insuranceType) * input.extraDays;
  const extraTotal = extraGuestBase + extraInsuranceFee;
  return { extraHostBase, extraGuestBase, extraMargin, extraInsuranceFee, extraTotal };
}

/**
 * The refund for pulling a paid trip's end date IN by `removedDays`. Unused
 * daily hire + protection are refunded at the cancellation policy's percentage
 * for the tail; Redrive's margin on those days is always credited back in full
 * since the guest never used the service for them. The host keeps the
 * non-refunded hire portion as short-notice compensation.
 */
export function buildShortenQuote(input: {
  dailyRate: number;
  paidDays: number;
  removedDays: number;
  insuranceType?: string | null;
  refundPercentage: number; // 0..100, from the reservation's cancellation policy
}) {
  const factor = Math.max(0, Math.min(100, input.refundPercentage)) / 100;
  const removedDays = Math.max(0, Math.min(input.removedDays, input.paidDays - 1));
  const remainingDays = input.paidDays - removedDays;
  const removedHostBase = input.dailyRate * removedDays;
  const removedGuestBase = guestDailyPrice(input.dailyRate) * removedDays;
  const marginCredit = removedGuestBase - removedHostBase;
  const removedInsuranceFee = insuranceDailyRate(input.insuranceType) * removedDays;
  const hireRefund = Math.round((removedHostBase + removedInsuranceFee) * factor);
  const refundTotal = hireRefund + marginCredit;
  const ownerReduction = Math.round(removedHostBase * factor);
  return {
    removedDays,
    remainingDays,
    removedHostBase,
    removedGuestBase,
    removedInsuranceFee,
    marginCredit,
    hireRefund,
    refundTotal,
    ownerReduction,
  };
}
