import assert from "node:assert/strict";
import test from "node:test";

import { mayRevealContactDetails, mayRevealExactLocation } from "./reservationAccess";

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

test("contact details stay hidden while a request is only under review", () => {
  assert.equal(
    mayRevealContactDetails({ reservationStatus: "REVIEWING", paymentStatus: null }),
    false,
  );
});

test("contact details open up once a booking is approved or paid", () => {
  assert.ok(mayRevealContactDetails({ reservationStatus: "APPROVED", paymentStatus: "NOT_STARTED" }));
  assert.ok(mayRevealContactDetails({ reservationStatus: "REVIEWING", paymentStatus: "PAID_HELD" }));
  for (const status of ["ACTIVE", "COMPLETED"]) {
    assert.ok(mayRevealContactDetails({ reservationStatus: status, paymentStatus: null }));
  }
});

test("a declined, expired or cancelled booking never exposes contact details", () => {
  for (const status of ["DECLINED", "EXPIRED", "CANCELLED"]) {
    assert.equal(
      mayRevealContactDetails({ reservationStatus: status, paymentStatus: "REFUNDED" }),
      false,
    );
  }
});
