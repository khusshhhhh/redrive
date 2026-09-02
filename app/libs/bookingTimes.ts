/**
 * Time-of-day handling for the two physical handovers on a booking.
 *
 * A booking's `startDate` / `endDate` are calendar days only. Each handover
 * also has a time of day, stored as a plain "HH:MM" 24-hour string in the
 * vehicle's timezone (`Listing.timezone`; see `libs/timezone.ts`).
 *
 * Ownership: the **host** owns the pickup time (they hand the vehicle over);
 * the **guest** owns the return time. The non-owning party may *propose* a
 * change — it stays unconfirmed until the owner confirms. Whoever acts, the
 * other side is notified.
 */

import {
  resolveListingTimezone,
  zonedCalendarDay,
  zonedWallTimeToUtc,
} from "@/app/libs/timezone";

export const DEFAULT_PICKUP_TIME = "10:00";
export const DEFAULT_HANDOVER_TIME = "10:00";

/**
 * Platform fallback pickup window, used when a host hasn't set one on the
 * listing. Keeps proposals to sane daytime hours instead of "any time".
 */
export const DEFAULT_PICKUP_WINDOW_START = "06:00";
export const DEFAULT_PICKUP_WINDOW_END = "22:00";

/** Grid the pickers snap to. */
export const TIME_SLOT_MINUTES = 30;

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type HandoverKind = "PICKUP" | "HANDOVER";
export type BookingRole = "HOST" | "GUEST";

/** The party who owns (has final say on) a given handover time. */
export function ownerRole(kind: HandoverKind): BookingRole {
  return kind === "PICKUP" ? "HOST" : "GUEST";
}

export function otherRole(role: BookingRole): BookingRole {
  return role === "HOST" ? "GUEST" : "HOST";
}

/** True when `value` is a well-formed "HH:MM" 24-hour time. */
export function isValidTimeOfDay(value: unknown): value is string {
  return typeof value === "string" && TIME_OF_DAY.test(value);
}

/** Normalise a loose input ("9:5", " 09:05 ") to "HH:MM", or null if unusable. */
export function normalizeTimeOfDay(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function minutesOfDay(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/**
 * The effective pickup window for a listing: the host's own bounds, or the
 * platform default when either bound is missing/invalid.
 */
export function effectivePickupWindow(
  windowStart?: string | null,
  windowEnd?: string | null,
): { start: string; end: string; isDefault: boolean } {
  if (isValidTimeOfDay(windowStart) && isValidTimeOfDay(windowEnd)) {
    return { start: windowStart, end: windowEnd, isDefault: false };
  }
  return {
    start: DEFAULT_PICKUP_WINDOW_START,
    end: DEFAULT_PICKUP_WINDOW_END,
    isDefault: true,
  };
}

/**
 * Whether `time` sits inside the (effective) pickup window. A window whose
 * bounds are equal means "only that exact time". A window that wraps past
 * midnight ("22:00"–"06:00") spans the boundary.
 */
export function withinWindow(
  time: string,
  windowStart?: string | null,
  windowEnd?: string | null,
): boolean {
  if (!isValidTimeOfDay(time)) return false;
  const { start, end } = effectivePickupWindow(windowStart, windowEnd);
  const value = minutesOfDay(time);
  const lo = minutesOfDay(start);
  const hi = minutesOfDay(end);
  if (lo === hi) return value === lo;
  return lo < hi ? value >= lo && value <= hi : value >= lo || value <= hi;
}

/**
 * Resolve the pickup time to store on a new reservation. A guest proposal is
 * honoured when it's inside the window; otherwise we use the window's opening
 * time, then the platform default. Shared by the web and mobile create routes
 * so both surfaces behave identically.
 */
export function resolvePickupTime(input: {
  requested?: unknown;
  windowStart?: string | null;
  windowEnd?: string | null;
}): string {
  const requested = normalizeTimeOfDay(input.requested);
  if (requested && withinWindow(requested, input.windowStart, input.windowEnd)) {
    return requested;
  }
  const { start } = effectivePickupWindow(input.windowStart, input.windowEnd);
  return start || DEFAULT_PICKUP_TIME;
}

/** 30-minute slot labels spanning the effective window, inclusive of both ends. */
export function timeSlots(
  windowStart?: string | null,
  windowEnd?: string | null,
  stepMinutes = TIME_SLOT_MINUTES,
): string[] {
  const { start, end } = effectivePickupWindow(windowStart, windowEnd);
  const lo = minutesOfDay(start);
  let hi = minutesOfDay(end);
  if (hi <= lo) hi += 1440; // wrap past midnight
  const slots: string[] = [];
  for (let m = lo; m <= hi; m += stepMinutes) slots.push(fromMinutes(m));
  return slots;
}

/**
 * For a same-calendar-day booking, the return can't be at or before pickup.
 * Multi-day bookings are always fine.
 */
export function isReturnBeforePickup(
  startDate: Date | string,
  endDate: Date | string,
  pickupTime?: string | null,
  handoverTime?: string | null,
  timezone = "Australia/Sydney",
): boolean {
  if (!isValidTimeOfDay(pickupTime) || !isValidTimeOfDay(handoverTime)) return false;
  const start = zonedCalendarDay(new Date(startDate), timezone);
  const end = zonedCalendarDay(new Date(endDate), timezone);
  if (start.year !== end.year || start.month !== end.month || start.day !== end.day) {
    return false;
  }
  return minutesOfDay(handoverTime) <= minutesOfDay(pickupTime);
}

/** The UTC instant a handover happens: its calendar day + wall time in `zone`. */
export function combineDateAndTime(
  day: Date | string,
  time: string,
  zone: string,
): Date {
  const { year, month, day: d } = zonedCalendarDay(new Date(day), zone);
  const [hour, minute] = time.split(":").map(Number);
  return zonedWallTimeToUtc(year, month, d, hour, minute, zone);
}

export function pickupInstant(
  reservation: { startDate: Date | string; pickupTime?: string | null },
  listing: { timezone?: string | null; state?: string | null } | null | undefined,
): Date {
  const zone = resolveListingTimezone(listing);
  const time = isValidTimeOfDay(reservation.pickupTime)
    ? reservation.pickupTime
    : DEFAULT_PICKUP_TIME;
  return combineDateAndTime(reservation.startDate, time, zone);
}

export function returnInstant(
  reservation: { endDate: Date | string; handoverTime?: string | null },
  listing: { timezone?: string | null; state?: string | null } | null | undefined,
): Date {
  const zone = resolveListingTimezone(listing);
  const time = isValidTimeOfDay(reservation.handoverTime)
    ? reservation.handoverTime
    : DEFAULT_HANDOVER_TIME;
  return combineDateAndTime(reservation.endDate, time, zone);
}

/**
 * Decide what a time change does. Pure so the route and its tests share it.
 *
 * - The owner (host for pickup, guest for return) setting a time confirms it.
 * - The non-owner setting a time *proposes* it; it stays unconfirmed.
 * - `action: "CONFIRM"` is the owner accepting a pending proposal.
 */
export function decideTimeChange(input: {
  kind: HandoverKind;
  actorRole: BookingRole;
  action: "SET" | "CONFIRM";
}): {
  confirmed: boolean;
  proposedByRole: BookingRole | null;
  notifyRole: BookingRole;
  variant: "CHANGED" | "PROPOSED" | "CONFIRMED";
} {
  const owner = ownerRole(input.kind);
  if (input.action === "CONFIRM") {
    return { confirmed: true, proposedByRole: null, notifyRole: otherRole(owner), variant: "CONFIRMED" };
  }
  if (input.actorRole === owner) {
    return { confirmed: true, proposedByRole: null, notifyRole: otherRole(owner), variant: "CHANGED" };
  }
  return { confirmed: false, proposedByRole: input.actorRole, notifyRole: owner, variant: "PROPOSED" };
}

/** "10:00" → "10:00 am", "16:30" → "4:30 pm". */
export function formatTimeOfDay(value?: string | null): string {
  if (!isValidTimeOfDay(value)) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours < 12 ? "am" : "pm";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Short human label for a window, e.g. "8:00 am – 8:00 pm", or null if unset. */
export function formatWindow(
  windowStart?: string | null,
  windowEnd?: string | null,
): string | null {
  if (!isValidTimeOfDay(windowStart) || !isValidTimeOfDay(windowEnd)) return null;
  return `${formatTimeOfDay(windowStart)} – ${formatTimeOfDay(windowEnd)}`;
}
