import assert from "node:assert/strict";
import test from "node:test";

import { REDRIVE_MARGIN_RATE, guestDailyPrice, redriveMargin, tripPriceBreakdown } from "./pricing";

test("guest daily price adds the 17% margin, rounded per day", () => {
  assert.equal(REDRIVE_MARGIN_RATE, 0.17);
  assert.equal(guestDailyPrice(100), 117);
  assert.equal(guestDailyPrice(95), 111); // 111.15 → 111
  assert.equal(guestDailyPrice(0), 0);
});

test("redrive margin is the per-day gap times the number of days", () => {
  assert.equal(redriveMargin(100, 3), (117 - 100) * 3);
  assert.equal(redriveMargin(95, 3), (111 - 95) * 3);
});

test("breakdown splits host base, guest base and margin", () => {
  const b = tripPriceBreakdown(120, 3);
  assert.equal(b.hostDailyRate, 120);
  assert.equal(b.guestDailyRate, 140); // 140.4 → 140
  assert.equal(b.hostBase, 360);
  assert.equal(b.guestBase, 420);
  assert.equal(b.margin, 60);
  assert.equal(b.total, 420);
});
