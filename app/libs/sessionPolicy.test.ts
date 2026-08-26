import assert from "node:assert/strict";
import test from "node:test";

import { sessionIdleTimeoutMs, sessionIsIdle } from "./sessionPolicy";

test("session idle timeout defaults to one hour and accepts safe overrides", () => {
  assert.equal(sessionIdleTimeoutMs(undefined), 60 * 60_000);
  assert.equal(sessionIdleTimeoutMs("30"), 30 * 60_000);
  assert.equal(sessionIdleTimeoutMs("14"), 60 * 60_000);
  assert.equal(sessionIdleTimeoutMs("not-a-number"), 60 * 60_000);
});

test("session idle boundary expires at the configured timeout", () => {
  assert.equal(sessionIsIdle(1_000, 60_999, 60_000), false);
  assert.equal(sessionIsIdle(1_000, 61_000, 60_000), true);
  assert.equal(sessionIsIdle(Number.NaN, 1_000, 60_000), true);
});
