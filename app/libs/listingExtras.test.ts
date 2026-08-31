import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeListingExtras } from "./listingExtras";

test("omits fields that are absent from the body", () => {
  const result = sanitizeListingExtras({ title: "unrelated" });
  assert.deepEqual(result, {});
});

test("coerces integer fields and turns blanks into null", () => {
  const result = sanitizeListingExtras({ odometer: "85000", seatbeltCount: "", keysProvided: 2 });
  assert.equal(result.odometer, 85000);
  assert.equal(result.seatbeltCount, null);
  assert.equal(result.keysProvided, 2);
});

test("coerces float fields", () => {
  const result = sanitizeListingExtras({ excessKmFee: "0.33", batteryCapacityKwh: "" });
  assert.equal(result.excessKmFee, 0.33);
  assert.equal(result.batteryCapacityKwh, null);
});

test("trims strings and maps empty strings to null", () => {
  const result = sanitizeListingExtras({ transmission: " AUTOMATIC ", colour: "   " });
  assert.equal(result.transmission, "AUTOMATIC");
  assert.equal(result.colour, null);
});

test("interprets only truthy tokens as boolean true", () => {
  assert.equal(sanitizeListingExtras({ petsAllowed: true }).petsAllowed, true);
  assert.equal(sanitizeListingExtras({ petsAllowed: "true" }).petsAllowed, true);
  assert.equal(sanitizeListingExtras({ petsAllowed: "false" }).petsAllowed, false);
  assert.equal(sanitizeListingExtras({ petsAllowed: false }).petsAllowed, false);
  assert.equal(sanitizeListingExtras({ smokeFree: undefined }).smokeFree, undefined);
});

test("dedupes and filters string arrays", () => {
  const result = sanitizeListingExtras({ safetyFeatures: ["aeb", "aeb", "", 5, "lane_keep"] });
  assert.deepEqual(result.safetyFeatures, ["aeb", "lane_keep"]);
});

test("parses lastServicedAt to a Date and rejects bad input", () => {
  const good = sanitizeListingExtras({ lastServicedAt: "2026-01-15" });
  assert.ok(good.lastServicedAt instanceof Date);
  const bad = sanitizeListingExtras({ lastServicedAt: "not-a-date" });
  assert.equal(bad.lastServicedAt, null);
});

test("clamps bounded numeric fields", () => {
  assert.equal(sanitizeListingExtras({ ancapRating: "9" }).ancapRating, 5);
  assert.equal(sanitizeListingExtras({ ancapRating: "0" }).ancapRating, 1);
  assert.equal(sanitizeListingExtras({ weeklyDiscountPercent: "200" }).weeklyDiscountPercent, 90);
});
