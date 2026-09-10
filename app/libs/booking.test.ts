import assert from "node:assert/strict";
import test from "node:test";

import { buildBookingQuote } from "./booking";
import { guestDailyPrice } from "./pricing";

test("buildBookingQuote splits the host base from the guest all-in price", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const end = new Date("2026-09-03T00:00:00Z"); // inclusive → 3 days
  const quote = buildBookingQuote({ dailyRate: 120, startDate: start, endDate: end });

  assert.equal(quote.days, 3);
  assert.equal(quote.hostDailyRate, 120);
  assert.equal(quote.guestDailyRate, guestDailyPrice(120)); // 140
  assert.equal(quote.hostBase, 360);
  assert.equal(quote.guestBase, 420);
  assert.equal(quote.margin, 60);
  assert.equal(quote.insuranceType, "No Insurance");
  assert.equal(quote.total, 420); // guest pays the all-in hire, no separate fees
});

test("buildBookingQuote adds protection and cleaning on top of the guest base", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const end = new Date("2026-09-02T00:00:00Z"); // 2 days
  const quote = buildBookingQuote({
    dailyRate: 100,
    startDate: start,
    endDate: end,
    insuranceType: "Happy Driver", // $40/day
    cleaningFee: 55,
  });

  assert.equal(quote.days, 2);
  assert.equal(quote.hostBase, 200);
  assert.equal(quote.guestBase, guestDailyPrice(100) * 2); // 117 * 2 = 234
  assert.equal(quote.insuranceFee, 80);
  assert.equal(quote.cleaningFee, 55);
  assert.equal(quote.total, 234 + 80 + 55);
});

test("buildBookingQuote falls back to No Insurance for an unknown option", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const end = new Date("2026-09-01T00:00:00Z");
  const quote = buildBookingQuote({ dailyRate: 90, startDate: start, endDate: end, insuranceType: "Bogus" });
  assert.equal(quote.insuranceType, "No Insurance");
  assert.equal(quote.insuranceFee, 0);
});
