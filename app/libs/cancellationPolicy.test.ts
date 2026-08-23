import assert from "node:assert/strict";
import test from "node:test";

import { calculateCancellationOutcome, normalizeCancellationPolicy } from "./cancellationPolicy";

const pickup = new Date("2026-09-01T09:00:00+09:30");
const cancelOn29August = new Date("2026-08-29T09:00:00+09:30");

test("applies each listing policy to the same three-day cancellation", () => {
  assert.equal(calculateCancellationOutcome({ policy: "FLEXIBLE", pickupAt: pickup, cancelledAt: cancelOn29August }).refundPercentage, 100);
  assert.equal(calculateCancellationOutcome({ policy: "MODERATE", pickupAt: pickup, cancelledAt: cancelOn29August }).refundPercentage, 50);
  assert.equal(calculateCancellationOutcome({ policy: "FIRM", pickupAt: pickup, cancelledAt: cancelOn29August }).refundPercentage, 0);
});

test("host cancellation always refunds in full before pickup", () => {
  assert.equal(calculateCancellationOutcome({ policy: "FIRM", pickupAt: pickup, cancelledAt: cancelOn29August, cancelledByHost: true }).refundPercentage, 100);
});

test("does not permit ordinary cancellation after pickup", () => {
  assert.equal(calculateCancellationOutcome({ policy: "FLEXIBLE", pickupAt: pickup, cancelledAt: new Date("2026-09-01T10:00:00+09:30") }).canCancel, false);
});

test("normalises unknown policy data to the balanced default", () => {
  assert.equal(normalizeCancellationPolicy("unexpected"), "MODERATE");
});
