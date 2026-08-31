/**
 * Shared trip-price maths so the booking panel, the listing page and the
 * home-page estimator can never drift apart.
 *
 * The guest pays: base (daily rate × days) + a percentage Redrive fee + a
 * flat, tiered service fee. Insurance and any host security deposit are added
 * per listing / per booking and are not modelled here.
 */

export const REDRIVE_FEE_RATE = 0.08;

/** Flat service fee, banded by the base reservation cost. */
export function calculateServiceFee(basePrice: number): number {
  if (basePrice <= 200) return 10;
  if (basePrice <= 400) return 25;
  if (basePrice <= 800) return 40;
  if (basePrice <= 1200) return 60;
  if (basePrice <= 2000) return 80;
  return 100;
}

export function redriveFee(basePrice: number): number {
  return Math.round(basePrice * REDRIVE_FEE_RATE);
}

export interface TripPriceBreakdown {
  days: number;
  dailyRate: number;
  base: number;
  redriveFee: number;
  serviceFee: number;
  total: number;
}

export function tripPriceBreakdown(dailyRate: number, days: number): TripPriceBreakdown {
  const base = dailyRate * days;
  const fee = redriveFee(base);
  const service = calculateServiceFee(base);
  return {
    days,
    dailyRate,
    base,
    redriveFee: fee,
    serviceFee: service,
    total: base + fee + service,
  };
}
