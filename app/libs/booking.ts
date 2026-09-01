import { calculateServiceFee, redriveFee } from "@/app/libs/pricing";

// The fee primitives (service-fee tiers, the percentage Redrive fee) live in
// `pricing.ts` so the booking panel, the listing page, the home-page estimator
// and the server quote can never disagree. This module adds the parts that are
// specific to a real booking: insurance, cleaning and the policy version.
export const PRICING_POLICY_VERSION = "2026-08-17";

export { calculateServiceFee };

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
  const basePrice = input.dailyRate * days;
  const insuranceFee = insuranceDailyRates[insuranceType] * days;
  const bookingRedriveFee = redriveFee(basePrice);
  const serviceFee = calculateServiceFee(basePrice);
  const cleaningFee = Math.max(0, Math.round(input.cleaningFee || 0));

  return {
    days,
    dailyRate: input.dailyRate,
    basePrice,
    redriveFee: bookingRedriveFee,
    serviceFee,
    insuranceType,
    insuranceFee,
    cleaningFee,
    total: basePrice + bookingRedriveFee + serviceFee + insuranceFee + cleaningFee,
    currency: "AUD",
    policyVersion: PRICING_POLICY_VERSION,
  };
}

/**
 * The pro-rata cost of moving a paid trip's end date out by `extraDays`. The
 * service fee is charged on the delta of the tiered band (new total base vs the
 * base already paid), so a longer trip that crosses a band pays the difference.
 */
export function buildExtensionQuote(input: {
  dailyRate: number;
  paidDays: number;
  extraDays: number;
  insuranceType?: string | null;
}) {
  const extraBase = input.dailyRate * input.extraDays;
  const oldBase = input.dailyRate * input.paidDays;
  const newBase = oldBase + extraBase;
  const extraInsuranceFee = insuranceDailyRate(input.insuranceType) * input.extraDays;
  const extraRedriveFee = redriveFee(newBase) - redriveFee(oldBase);
  const extraServiceFee = Math.max(0, calculateServiceFee(newBase) - calculateServiceFee(oldBase));
  const extraTotal = extraBase + extraInsuranceFee + extraRedriveFee + extraServiceFee;
  return { extraBase, extraInsuranceFee, extraRedriveFee, extraServiceFee, extraTotal };
}

/**
 * The refund for pulling a paid trip's end date IN by `removedDays`. Unused
 * daily hire + protection are refunded at the cancellation policy's percentage
 * for the tail; the platform fees for those days (Redrive fee + service fee) are
 * always credited back in full since the guest never used them. The host keeps
 * the non-refunded hire portion as short-notice compensation.
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
  const oldBase = input.dailyRate * input.paidDays;
  const newBase = input.dailyRate * remainingDays;
  const removedBase = oldBase - newBase;
  const removedInsuranceFee = insuranceDailyRate(input.insuranceType) * removedDays;
  const redriveFeeCredit = Math.max(0, redriveFee(oldBase) - redriveFee(newBase));
  const serviceFeeCredit = Math.max(0, calculateServiceFee(oldBase) - calculateServiceFee(newBase));
  const hireRefund = Math.round((removedBase + removedInsuranceFee) * factor);
  const refundTotal = hireRefund + redriveFeeCredit + serviceFeeCredit;
  const ownerReduction = Math.round(removedBase * factor);
  return {
    removedDays,
    remainingDays,
    removedBase,
    removedInsuranceFee,
    redriveFeeCredit,
    serviceFeeCredit,
    hireRefund,
    refundTotal,
    ownerReduction,
  };
}
