import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveListingTimezone,
  timezoneForState,
  tzAbbrev,
  zonedCalendarDay,
  zonedWallTimeToUtc,
} from "./timezone";

test("timezoneForState maps AU states, defaults to Sydney", () => {
  assert.equal(timezoneForState("SA"), "Australia/Adelaide");
  assert.equal(timezoneForState("wa"), "Australia/Perth");
  assert.equal(timezoneForState("ACT"), "Australia/Sydney");
  assert.equal(timezoneForState(null), "Australia/Sydney");
  assert.equal(timezoneForState("ZZ"), "Australia/Sydney");
});

test("resolveListingTimezone prefers an explicit valid zone, else state", () => {
  assert.equal(resolveListingTimezone({ timezone: "Australia/Perth", state: "SA" }), "Australia/Perth");
  assert.equal(resolveListingTimezone({ timezone: "Not/AZone", state: "SA" }), "Australia/Adelaide");
  assert.equal(resolveListingTimezone({ state: "QLD" }), "Australia/Brisbane");
});

test("zonedWallTimeToUtc resolves AEST (no DST) correctly", () => {
  // 1 Jul 2026 is winter — Brisbane and Sydney are both UTC+10, no DST.
  const utc = zonedWallTimeToUtc(2026, 7, 1, 10, 0, "Australia/Brisbane");
  assert.equal(utc.toISOString(), "2026-07-01T00:00:00.000Z");
});

test("zonedWallTimeToUtc resolves AEDT (summer DST) correctly", () => {
  // 15 Jan 2026 — Sydney is on daylight time, UTC+11.
  const utc = zonedWallTimeToUtc(2026, 1, 15, 10, 0, "Australia/Sydney");
  assert.equal(utc.toISOString(), "2026-01-14T23:00:00.000Z");
});

test("zonedWallTimeToUtc resolves ACST half-hour offset", () => {
  // Adelaide winter is UTC+9:30.
  const utc = zonedWallTimeToUtc(2026, 7, 1, 9, 30, "Australia/Adelaide");
  assert.equal(utc.toISOString(), "2026-07-01T00:00:00.000Z");
});

test("zonedCalendarDay reads the day in the target zone", () => {
  // 23:00 UTC on 14 Jan is already 15 Jan in Sydney (UTC+11).
  const day = zonedCalendarDay(new Date("2026-01-14T23:00:00.000Z"), "Australia/Sydney");
  assert.deepEqual(day, { year: 2026, month: 1, day: 15 });
});

test("tzAbbrev returns a plausible label", () => {
  const label = tzAbbrev(new Date("2026-07-01T00:00:00.000Z"), "Australia/Sydney");
  assert.match(label, /AE[SD]T|GMT\+10/);
});
