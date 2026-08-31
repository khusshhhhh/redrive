import assert from "node:assert/strict";
import test from "node:test";

import { calculateServiceFee, redriveFee, tripPriceBreakdown } from "./pricing";

test("service fee follows the documented bands", () => {
  assert.equal(calculateServiceFee(0), 10);
  assert.equal(calculateServiceFee(200), 10);
  assert.equal(calculateServiceFee(201), 25);
  assert.equal(calculateServiceFee(400), 25);
  assert.equal(calculateServiceFee(800), 40);
  assert.equal(calculateServiceFee(1200), 60);
  assert.equal(calculateServiceFee(2000), 80);
  assert.equal(calculateServiceFee(2001), 100);
});

test("redrive fee is 8% rounded", () => {
  assert.equal(redriveFee(100), 8);
  assert.equal(redriveFee(190), 15);
  assert.equal(redriveFee(0), 0);
});

test("breakdown sums base + redrive + service", () => {
  const b = tripPriceBreakdown(120, 3);
  assert.equal(b.base, 360);
  assert.equal(b.redriveFee, 29);
  assert.equal(b.serviceFee, 25);
  assert.equal(b.total, 414);
});
