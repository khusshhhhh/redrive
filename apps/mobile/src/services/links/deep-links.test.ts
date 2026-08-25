import assert from "node:assert/strict";
import test from "node:test";

import { parseRedriveDeepLink, safeDeepLinkDestination } from "./deep-links";

const id = "507f1f77bcf86cd799439011";
const options = { appScheme: "redrive-development", verifiedHost: "redrive.example" };

test("accepts a public verified listing URL", () => {
  assert.deepEqual(parseRedriveDeepLink(`https://redrive.example/listings/${id}`, options), {
    href: `/(public)/listing/${id}`,
    kind: "listing",
    resourceId: id,
    requiresAuthentication: false,
  });
});

test("accepts controlled custom-scheme trip and message URLs", () => {
  assert.equal(parseRedriveDeepLink(`redrive-development://trips/${id}`, options)?.href, `/(app)/reservation/${id}`);
  assert.equal(parseRedriveDeepLink(`redrive-development://messages/${id}`, options)?.href, `/(app)/chat/${id}`);
});

test("accepts an Expo Router path but rejects traversal, foreign hosts and malformed IDs", () => {
  assert.equal(parseRedriveDeepLink(`/listings/${id}?ignored=true`, options)?.resourceId, id);
  assert.equal(parseRedriveDeepLink(`https://evil.example/listings/${id}`, options), null);
  assert.equal(parseRedriveDeepLink("//evil.example/listings/507f1f77bcf86cd799439011", options), null);
  assert.equal(parseRedriveDeepLink("/listings/not-an-object-id", options), null);
  assert.equal(parseRedriveDeepLink(`/trips/${id}/approve`, options), null);
});

test("unknown links resolve to the safe public home and never trigger actions", () => {
  assert.equal(safeDeepLinkDestination("redrive-development://delete-account", options), "/");
  assert.equal(safeDeepLinkDestination("not a valid URL", options), "/");
});
