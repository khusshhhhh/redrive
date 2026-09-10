import assert from "node:assert/strict";
import test from "node:test";

import { buildShortenQuote } from "./booking";
import { guestDailyPrice } from "./pricing";

test("shorten quote refunds unused hire at the policy percentage, margin in full", () => {
  // Paid: 5 days @ $100. Return 2 days early → 3 days used.
  const q = buildShortenQuote({
    dailyRate: 100,
    paidDays: 5,
    removedDays: 2,
    insuranceType: "No Insurance",
    refundPercentage: 50,
  });
  assert.equal(q.remainingDays, 3);
  assert.equal(q.removedHostBase, 200);
  assert.equal(q.removedGuestBase, guestDailyPrice(100) * 2); // 117 * 2 = 234
  assert.equal(q.hireRefund, 100); // 50% of $200 host base
  assert.equal(q.marginCredit, 234 - 200); // full margin on the unused days
  assert.equal(q.refundTotal, q.hireRefund + q.marginCredit);
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
  assert.equal(q.hireRefund, 100 + 40); // full refund of $100 host base + $40 protection
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
