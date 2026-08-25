import assert from "node:assert/strict";
import test from "node:test";

import { notificationDestination } from "./notification-links";

const options = { appScheme: "redrive", verifiedHost: "redrive.example" };
const id = "507f1f77bcf86cd799439011";

test("maps only allowlisted opaque notification resources", () => {
  assert.equal(notificationDestination({ type: "listing", resourceId: id }, options), `/(public)/listing/${id}`);
  assert.equal(notificationDestination({ type: "trip", resourceId: id, privateAddress: "ignored" }, options), `/(app)/reservation/${id}`);
  assert.equal(notificationDestination({ type: "message", resourceId: id, messageBody: "ignored" }, options), `/(app)/chat/${id}`);
});

test("rejects actions, unknown types, malformed IDs and non-object payloads", () => {
  assert.equal(notificationDestination({ type: "approve-booking", resourceId: id }, options), "/");
  assert.equal(notificationDestination({ type: "trip", resourceId: "wrong" }, options), "/");
  assert.equal(notificationDestination("trip", options), "/");
});
