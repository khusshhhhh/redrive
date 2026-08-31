import assert from "node:assert/strict";
import test from "node:test";

import { mayRevealExactLocation } from "./reservationAccess";

test("the host always sees the exact location", () => {
  assert.ok(
    mayRevealExactLocation({
      isOwner: true,
      reservationStatus: "REVIEWING",
      paymentStatus: null,
    }),
  );
});

test("a guest does not see the address on an unpaid, approved booking by default", () => {
  assert.equal(
    mayRevealExactLocation({
      isOwner: false,
      reservationStatus: "APPROVED",
      paymentStatus: "NOT_STARTED",
    }),
    false,
  );
});

test("a guest sees the address once the booking is paid", () => {
  assert.ok(
    mayRevealExactLocation({
      isOwner: false,
      reservationStatus: "APPROVED",
      paymentStatus: "PAID_HELD",
    }),
  );
});

test("a host can opt into revealing at approval", () => {
  assert.ok(
    mayRevealExactLocation({
      isOwner: false,
      reservationStatus: "APPROVED",
      paymentStatus: "NOT_STARTED",
      releaseRule: "APPROVED_BOOKING",
    }),
  );
});

test("an active or completed trip always reveals", () => {
  for (const status of ["ACTIVE", "COMPLETED"]) {
    assert.ok(
      mayRevealExactLocation({ isOwner: false, reservationStatus: status, paymentStatus: null }),
    );
  }
});

test("a declined or cancelled booking never reveals to the guest", () => {
  for (const status of ["DECLINED", "CANCELLED", "EXPIRED"]) {
    assert.equal(
      mayRevealExactLocation({ isOwner: false, reservationStatus: status, paymentStatus: "REFUNDED" }),
      false,
    );
  }
});
