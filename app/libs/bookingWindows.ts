/**
 * The time windows the booking lifecycle runs on, in one place so the API
 * routes, the crons and the UI copy can't drift.
 */

/** How long a guest has to pay after a host approves a request. */
export const PAYMENT_WINDOW_HOURS = 48;

/** An unanswered REVIEWING request auto-declines after this. */
export const REQUEST_AUTO_DECLINE_HOURS = 48;

/** A trip-extension request lapses if not paid within this. */
export const EXTENSION_REQUEST_TTL_HOURS = 48;

/**
 * After both parties agree the return handover, the payout is held for this
 * long so the host can inspect the vehicle and open a damage claim. No claim,
 * and the payout releases automatically (payouts cron). Matches Turo's 24-hour
 * claim-filing rule.
 */
export const CLAIM_WINDOW_HOURS = 24;

/**
 * Backstop for a stalled return handover: once this long past the (possibly
 * extended) end date has passed — and a return handover was at least started —
 * the payout auto-releases even without the second acknowledgement.
 */
export const AUTO_RELEASE_AFTER_END_HOURS = 72;

export const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60_000);
