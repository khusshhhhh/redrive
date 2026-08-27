export const PRICING_POLICY_VERSION = "2026-08-17";

const insuranceDailyRates: Record<string, number> = {
  "No Insurance": 0,
  "Risk Taker": 20,
  "Happy Driver": 40,
};

export function calculateServiceFee(basePrice: number) {
  if (basePrice <= 200) return 10;
  if (basePrice <= 400) return 25;
  if (basePrice <= 800) return 40;
  if (basePrice <= 1200) return 60;
  if (basePrice <= 2000) return 80;
  return 100;
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
  const redriveFee = Math.round(basePrice * 0.08);
  const serviceFee = calculateServiceFee(basePrice);
  const cleaningFee = Math.max(0, Math.round(input.cleaningFee || 0));

  return {
    days,
    dailyRate: input.dailyRate,
    basePrice,
    redriveFee,
    serviceFee,
    insuranceType,
    insuranceFee,
    cleaningFee,
    total: basePrice + redriveFee + serviceFee + insuranceFee + cleaningFee,
    currency: "AUD",
    policyVersion: PRICING_POLICY_VERSION,
  };
}

