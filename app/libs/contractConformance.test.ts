import test from "node:test";
import assert from "node:assert/strict";

import {
  reviewResponseRequestSchema,
  reviewResponseResultSchema,
  savedSearchCreateRequestSchema,
  savedSearchResultSchema,
} from "@redrive/contracts/web";
import { quoteRequestSchema } from "@redrive/contracts/mobile";
import { quoteRequestSchema as quoteRequestSchemaRoot } from "@redrive/contracts";

const OID = "0123456789abcdef01234567";

test("web and mobile share the exact same quote request schema (cannot drift)", () => {
  assert.equal(quoteRequestSchema, quoteRequestSchemaRoot);
});

test("reviewResponseRequestSchema accepts a valid reply and rejects bad input", () => {
  assert.equal(reviewResponseRequestSchema.safeParse({ reviewId: OID, response: "Thanks!" }).success, true);
  // too short
  assert.equal(reviewResponseRequestSchema.safeParse({ reviewId: OID, response: "no" }).success, false);
  // not an object id
  assert.equal(reviewResponseRequestSchema.safeParse({ reviewId: "nope", response: "Thanks!" }).success, false);
  // over the length cap
  assert.equal(
    reviewResponseRequestSchema.safeParse({ reviewId: OID, response: "x".repeat(1501) }).success,
    false,
  );
});

test("the reviews/respond route response shape conforms to reviewResponseResultSchema", () => {
  // The exact object the route builds from a Prisma row.
  const responseBody = {
    id: OID,
    response: "Glad you enjoyed it",
    respondedAt: new Date("2026-01-02T03:04:05.000Z").toISOString(),
  };
  assert.equal(reviewResponseResultSchema.safeParse(responseBody).success, true);
  // respondedAt may be null before a reply exists.
  assert.equal(
    reviewResponseResultSchema.safeParse({ id: OID, response: null, respondedAt: null }).success,
    true,
  );
});

test("savedSearchCreateRequestSchema defaults frequency and validates name", () => {
  const parsed = savedSearchCreateRequestSchema.safeParse({
    name: "Utes near me",
    filters: { state: "VIC", maxPriceCents: 12000, delivery: true },
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.alertFrequency, "OFF");

  assert.equal(savedSearchCreateRequestSchema.safeParse({ name: "", filters: {} }).success, false);
});

test("the saved-searches route response shape conforms to savedSearchResultSchema", () => {
  const now = new Date("2026-02-03T04:05:06.000Z");
  const serialized = {
    id: OID,
    name: "Utes near me",
    filters: { state: "VIC" },
    alertFrequency: "DAILY" as const,
    active: true,
    lastNotifiedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  assert.equal(savedSearchResultSchema.safeParse(serialized).success, true);
});
