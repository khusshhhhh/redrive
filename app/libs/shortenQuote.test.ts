import assert from "node:assert/strict";
import test from "node:test";

import { buildShortenQuote } from "./booking";
import { calculateServiceFee, redriveFee } from "./pricing";

test("shorten quote refunds unused hire at the policy percentage, fees in full", () => {
  // Paid: 5 days @ $100 = $500 base. Return 2 days early → 3 days used, $300 base.
  const q = buildShortenQuote({
    dailyRate: 100,
    paidDays: 5,
    removedDays: 2,
    insuranceType: "No Insurance",
    refundPercentage: 50,
  });
  assert.equal(q.remainingDays, 3);
  assert.equal(q.removedBase, 200);
  assert.equal(q.hireRefund, 100); // 50% of $200
  assert.equal(q.redriveFeeCredit, redriveFee(500) - redriveFee(300));
  assert.equal(q.serviceFeeCredit, Math.max(0, calculateServiceFee(500) - calculateServiceFee(300)));
  assert.equal(q.refundTotal, q.hireRefund + q.redriveFeeCredit + q.serviceFeeCredit);
  assert.equal(q.ownerReduction, 100); // owner loses only the refunded portion
});

test("shorten quote includes protection for the unused days", () => {
  const q = buildShortenQuote({
    dailyRate: 100,
    paidDays: 4,
    removedDays: 1,
    insuranceType: "Happy Driver", // $40/day
    refundPercentage: 100,
  });
  assert.equal(q.removedInsuranceFee, 40);
  assert.equal(q.hireRefund, 100 + 40); // full refund of $100 base + $40 protection
});

test("shorten quote never removes the last paid day", () => {
  const q = buildShortenQuote({
    dailyRate: 80,
    paidDays: 2,
    removedDays: 5,
    insuranceType: null,
    refundPercentage: 100,
  });
  assert.equal(q.remainingDays, 1);
  assert.equal(q.removedDays, 1);
});
