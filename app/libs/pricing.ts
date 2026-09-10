/**
 * Shared trip-price maths so the booking panel, the listing page and the
 * home-page estimator can never drift apart.
 *
 * The model is deliberately simple: a host sets the daily rate they want to
 * *earn* (`listing.price` is always that host-net figure). Redrive adds a flat
 * percentage margin on top, and the guest sees a single all-in price — there is
 * no separate "service fee" or "Redrive fee" line anywhere on the guest side.
 * The split between what the guest pays and what the host earns is host-only
 * information (shown in the listing flow and on the host's booking view).
 *
 * Protection (insurance) and any host security deposit are added per listing /
 * per booking and are not modelled here.
 */

/** Redrive's margin, added to the host's daily rate to get the guest price. */
export const REDRIVE_MARGIN_RATE = 0.17;

/**
 * What a guest pays per day: the host's rate plus Redrive's margin, as one
 * figure. Rounded per-day so a card's "AU$117/day" and a total of "AU$117 × 3"
 * always agree.
 */
export function guestDailyPrice(hostDailyRate: number): number {
  return Math.round(hostDailyRate * (1 + REDRIVE_MARGIN_RATE));
}

/**
 * Redrive's margin on a booking = what the guest pays for the hire minus what
 * the host earns. Host-facing only.
 */
export function redriveMargin(hostDailyRate: number, days: number): number {
  return guestDailyPrice(hostDailyRate) * days - hostDailyRate * days;
}

export interface TripPriceBreakdown {
  days: number;
  /** The host's net daily rate. */
  hostDailyRate: number;
  /** What the guest pays per day (host rate + margin). */
  guestDailyRate: number;
  /** hostDailyRate × days — what the host earns for the hire. */
  hostBase: number;
  /** guestDailyRate × days — what the guest pays for the hire. */
  guestBase: number;
  /** guestBase − hostBase — Redrive's margin (host-facing only). */
  margin: number;
  /** The guest-facing hire total (add-ons like protection/cleaning are layered by callers). */
  total: number;
}

export function tripPriceBreakdown(hostDailyRate: number, days: number): TripPriceBreakdown {
  const guestDailyRate = guestDailyPrice(hostDailyRate);
  const hostBase = hostDailyRate * days;
  const guestBase = guestDailyRate * days;
  return {
    days,
    hostDailyRate,
    guestDailyRate,
    hostBase,
    guestBase,
    margin: guestBase - hostBase,
    total: guestBase,
  };
}
