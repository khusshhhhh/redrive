/**
 * Timezone handling for handover times.
 *
 * Handover times are stored as wall-clock "HH:MM" strings in the vehicle's
 * local zone. That zone lives on `Listing.timezone` (IANA); when it's missing
 * we fall back to the capital-city zone for the listing's state, then to
 * Sydney. All conversion is done with the platform `Intl` database — no extra
 * dependency — so DST (AEDT/AEST, ACDT/ACST) is handled correctly.
 */

export const DEFAULT_TIMEZONE = "Australia/Sydney";

/** Capital-city zone per Australian state / territory. */
const STATE_TIMEZONE: Record<string, string> = {
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
  WA: "Australia/Perth",
  TAS: "Australia/Hobart",
};

export function timezoneForState(state?: string | null): string {
  if (!state) return DEFAULT_TIMEZONE;
  return STATE_TIMEZONE[state.trim().toUpperCase()] ?? DEFAULT_TIMEZONE;
}

/** Best available zone for a listing-shaped object. */
export function resolveListingTimezone(
  listing: { timezone?: string | null; state?: string | null } | null | undefined,
): string {
  if (listing?.timezone && isValidTimeZone(listing.timezone)) return listing.timezone;
  return timezoneForState(listing?.state);
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Offset (ms) to add to a UTC instant to get the wall-clock reading in `zone`
 * at that instant. Positive east of UTC. Uses `Intl` parts, so it tracks DST.
 */
export function tzOffsetMs(date: Date, zone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime() + (date.getTime() % 1000);
}

/**
 * The UTC instant for a wall-clock date + time in `zone`.
 * `year`/`month`(1-12)/`day` name the calendar day; `hour`/`minute` the time.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  zone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  // First estimate the offset at the naive instant, then correct once more in
  // case that estimate landed on the other side of a DST transition.
  const firstOffset = tzOffsetMs(new Date(naiveUtc), zone);
  let result = naiveUtc - firstOffset;
  const secondOffset = tzOffsetMs(new Date(result), zone);
  if (secondOffset !== firstOffset) result = naiveUtc - secondOffset;
  return new Date(result);
}

/** Short zone label at a given instant, e.g. "AEST", "ACDT". */
export function tzAbbrev(date: Date, zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(date);
    const name = parts.find((part) => part.type === "timeZoneName")?.value;
    if (name && /^[A-Z]{2,5}$/.test(name)) return name;
    // Some runtimes return "GMT+10" — fall back to that.
    return name ?? "";
  } catch {
    return "";
  }
}

/** The calendar-day fields (in `zone`) of a stored booking date. */
export function zonedCalendarDay(date: Date, zone: string): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}
