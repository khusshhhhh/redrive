import assert from "node:assert/strict";
import test from "node:test";

import { buildExtensionQuote } from "./booking";
import { guestDailyPrice } from "./pricing";

test("extension quote splits the host top-up from the guest all-in extra", () => {
  // Paid: 3 days @ $120. Extend by 2 → host earns +$240, guest pays +2 × guest daily.
  const q = buildExtensionQuote({ dailyRate: 120, paidDays: 3, extraDays: 2, insuranceType: "No Insurance" });
  assert.equal(q.extraHostBase, 240);
  assert.equal(q.extraGuestBase, guestDailyPrice(120) * 2); // 140 * 2 = 280
  assert.equal(q.extraMargin, 280 - 240);
  assert.equal(q.extraInsuranceFee, 0);
  assert.equal(q.extraTotal, 280);
});

test("extension quote adds the daily protection rate for the extra days", () => {
  const q = buildExtensionQuote({ dailyRate: 100, paidDays: 2, extraDays: 3, insuranceType: "Happy Driver" });
  assert.equal(q.extraInsuranceFee, 40 * 3); // $40/day
  assert.equal(q.extraTotal, guestDailyPrice(100) * 3 + 120);
});
