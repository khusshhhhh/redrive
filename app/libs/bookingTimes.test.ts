import test from "node:test";
import assert from "node:assert/strict";

import {
  combineDateAndTime,
  decideTimeChange,
  effectivePickupWindow,
  formatTimeOfDay,
  formatWindow,
  isReturnBeforePickup,
  isValidTimeOfDay,
  normalizeTimeOfDay,
  ownerRole,
  resolvePickupTime,
  timeSlots,
  withinWindow,
} from "./bookingTimes";

test("isValidTimeOfDay accepts HH:MM 24h only", () => {
  assert.equal(isValidTimeOfDay("00:00"), true);
  assert.equal(isValidTimeOfDay("23:59"), true);
  assert.equal(isValidTimeOfDay("9:00"), false);
  assert.equal(isValidTimeOfDay("24:00"), false);
  assert.equal(isValidTimeOfDay("10:60"), false);
  assert.equal(isValidTimeOfDay(null), false);
});

test("normalizeTimeOfDay pads and rejects junk", () => {
  assert.equal(normalizeTimeOfDay(" 9:05 "), "09:05");
  assert.equal(normalizeTimeOfDay("10:00"), "10:00");
  assert.equal(normalizeTimeOfDay("25:00"), null);
  assert.equal(normalizeTimeOfDay("noon"), null);
});

test("effectivePickupWindow falls back to the platform default", () => {
  assert.deepEqual(effectivePickupWindow("08:00", "20:00"), {
    start: "08:00",
    end: "20:00",
    isDefault: false,
  });
  assert.deepEqual(effectivePickupWindow(null, null), {
    start: "06:00",
    end: "22:00",
    isDefault: true,
  });
  assert.equal(effectivePickupWindow("08:00", "bad").isDefault, true);
});

test("withinWindow uses the default window when unset, and exact-time when bounds equal", () => {
  assert.equal(withinWindow("10:00", "08:00", "20:00"), true);
  assert.equal(withinWindow("07:59", "08:00", "20:00"), false);
  assert.equal(withinWindow("05:00", null, null), false); // outside 06:00–22:00 default
  assert.equal(withinWindow("07:00", null, null), true);
  assert.equal(withinWindow("09:00", "09:00", "09:00"), true);
  assert.equal(withinWindow("09:30", "09:00", "09:00"), false);
});

test("withinWindow handles a window that wraps past midnight", () => {
  assert.equal(withinWindow("23:30", "22:00", "06:00"), true);
  assert.equal(withinWindow("05:00", "22:00", "06:00"), true);
  assert.equal(withinWindow("12:00", "22:00", "06:00"), false);
});

test("resolvePickupTime honours an in-window request, else the window opening", () => {
  assert.equal(
    resolvePickupTime({ requested: "14:00", windowStart: "08:00", windowEnd: "20:00" }),
    "14:00",
  );
  assert.equal(
    resolvePickupTime({ requested: "23:00", windowStart: "08:00", windowEnd: "20:00" }),
    "08:00",
  );
  assert.equal(resolvePickupTime({ requested: "bad" }), "06:00"); // default window opening
  assert.equal(resolvePickupTime({}), "06:00");
});

test("timeSlots spans the window inclusive, on the 30-min grid", () => {
  const slots = timeSlots("08:00", "09:30");
  assert.deepEqual(slots, ["08:00", "08:30", "09:00", "09:30"]);
  assert.equal(timeSlots(null, null)[0], "06:00");
  assert.equal(timeSlots("23:00", "01:00").includes("00:00"), true); // wraps midnight
});

test("ownerRole: host owns pickup, guest owns return", () => {
  assert.equal(ownerRole("PICKUP"), "HOST");
  assert.equal(ownerRole("HANDOVER"), "GUEST");
});

test("decideTimeChange: owner set confirms, non-owner set proposes, CONFIRM finalises", () => {
  // Host sets the pickup → confirmed, guest notified.
  assert.deepEqual(decideTimeChange({ kind: "PICKUP", actorRole: "HOST", action: "SET" }), {
    confirmed: true,
    proposedByRole: null,
    notifyRole: "GUEST",
    variant: "CHANGED",
  });
  // Guest proposes a pickup → unconfirmed, host must confirm.
  assert.deepEqual(decideTimeChange({ kind: "PICKUP", actorRole: "GUEST", action: "SET" }), {
    confirmed: false,
    proposedByRole: "GUEST",
    notifyRole: "HOST",
    variant: "PROPOSED",
  });
  // Host confirms the pending proposal → confirmed, guest notified.
  assert.deepEqual(decideTimeChange({ kind: "PICKUP", actorRole: "HOST", action: "CONFIRM" }), {
    confirmed: true,
    proposedByRole: null,
    notifyRole: "GUEST",
    variant: "CONFIRMED",
  });
  // Return: guest owns it.
  assert.equal(
    decideTimeChange({ kind: "HANDOVER", actorRole: "GUEST", action: "SET" }).confirmed,
    true,
  );
  assert.equal(
    decideTimeChange({ kind: "HANDOVER", actorRole: "HOST", action: "SET" }).variant,
    "PROPOSED",
  );
});

test("isReturnBeforePickup only fires on a same-day booking", () => {
  const day = "2026-07-01T00:00:00.000Z";
  const next = "2026-07-02T00:00:00.000Z";
  assert.equal(isReturnBeforePickup(day, day, "10:00", "09:00", "Australia/Brisbane"), true);
  assert.equal(isReturnBeforePickup(day, day, "10:00", "17:00", "Australia/Brisbane"), false);
  assert.equal(isReturnBeforePickup(day, next, "10:00", "09:00", "Australia/Brisbane"), false);
});

test("combineDateAndTime places the wall time on the booking's calendar day", () => {
  const instant = combineDateAndTime("2026-07-01T00:00:00.000Z", "09:00", "Australia/Brisbane");
  assert.equal(instant.toISOString(), "2026-06-30T23:00:00.000Z");
});

test("formatTimeOfDay renders a 12-hour label", () => {
  assert.equal(formatTimeOfDay("00:00"), "12:00 am");
  assert.equal(formatTimeOfDay("09:05"), "9:05 am");
  assert.equal(formatTimeOfDay("12:00"), "12:00 pm");
  assert.equal(formatTimeOfDay("16:30"), "4:30 pm");
  assert.equal(formatTimeOfDay("bad"), "—");
});

test("formatWindow is null unless both bounds are valid", () => {
  assert.equal(formatWindow("08:00", "20:00"), "8:00 am – 8:00 pm");
  assert.equal(formatWindow("08:00", null), null);
});
