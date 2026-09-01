import assert from "node:assert/strict";
import test from "node:test";

import { buildExtensionQuote } from "./booking";
import { calculateServiceFee, redriveFee } from "./pricing";

test("extension quote is the pro-rata delta of base, fee and service fee", () => {
  // Paid: 3 days @ $120 = $360 base. Extend by 2 → +$240 base, new base $600.
  const q = buildExtensionQuote({ dailyRate: 120, paidDays: 3, extraDays: 2, insuranceType: "No Insurance" });
  assert.equal(q.extraBase, 240);
  assert.equal(q.extraRedriveFee, redriveFee(600) - redriveFee(360));
  assert.equal(q.extraServiceFee, calculateServiceFee(600) - calculateServiceFee(360));
  assert.equal(q.extraInsuranceFee, 0);
  assert.equal(q.extraTotal, 240 + q.extraRedriveFee + q.extraServiceFee);
});

test("extension quote adds the daily insurance rate for the extra days", () => {
  const q = buildExtensionQuote({ dailyRate: 100, paidDays: 2, extraDays: 3, insuranceType: "Happy Driver" });
  assert.equal(q.extraInsuranceFee, 40 * 3); // $40/day
});

test("service-fee delta never goes negative", () => {
  const q = buildExtensionQuote({ dailyRate: 10, paidDays: 1, extraDays: 1, insuranceType: null });
  assert.ok(q.extraServiceFee >= 0);
});
