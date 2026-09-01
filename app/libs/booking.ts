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
