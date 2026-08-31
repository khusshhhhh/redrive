import assert from "node:assert/strict";
import test from "node:test";

import { buildBookingQuote } from "./booking";
import { calculateServiceFee, redriveFee } from "./pricing";

test("buildBookingQuote uses the shared fee primitives", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const end = new Date("2026-09-03T00:00:00Z"); // inclusive → 3 days
  const quote = buildBookingQuote({ dailyRate: 120, startDate: start, endDate: end });

  assert.equal(quote.days, 3);
  assert.equal(quote.basePrice, 360);
  assert.equal(quote.redriveFee, redriveFee(360));
  assert.equal(quote.serviceFee, calculateServiceFee(360));
  assert.equal(quote.insuranceType, "No Insurance");
  assert.equal(quote.total, 360 + quote.redriveFee + quote.serviceFee);
});

test("buildBookingQuote adds insurance and cleaning on top", () => {
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
  assert.equal(quote.basePrice, 200);
  assert.equal(quote.insuranceFee, 80);
  assert.equal(quote.cleaningFee, 55);
  assert.equal(
    quote.total,
    200 + quote.redriveFee + quote.serviceFee + 80 + 55,
  );
});

test("buildBookingQuote falls back to No Insurance for an unknown option", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const end = new Date("2026-09-01T00:00:00Z");
  const quote = buildBookingQuote({ dailyRate: 90, startDate: start, endDate: end, insuranceType: "Bogus" });
  assert.equal(quote.insuranceType, "No Insurance");
  assert.equal(quote.insuranceFee, 0);
});
