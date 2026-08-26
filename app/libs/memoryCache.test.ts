import assert from "node:assert/strict";
import test from "node:test";

import { BoundedMemoryCache } from "./memoryCache";
import { consumeMemoryRateLimits, type MemoryRateLimitRule } from "./memoryRateLimit";

test("bounded cache expires values without timers", () => {
  const cache = new BoundedMemoryCache<string>({ maxEntries: 2, ttlMs: 100 });
  cache.set("one", "value", 100, 1_000);
  assert.equal(cache.get("one", 1_099), "value");
  assert.equal(cache.get("one", 1_100), undefined);
  assert.equal(cache.size, 0);
});

test("bounded cache evicts the least recently used value", () => {
  const cache = new BoundedMemoryCache<string>({ maxEntries: 2, ttlMs: 1_000 });
  cache.set("one", "first", 1_000, 1_000);
  cache.set("two", "second", 1_000, 1_000);
  assert.equal(cache.get("one", 1_100), "first");
  cache.set("three", "third", 1_000, 1_100);
  assert.equal(cache.get("two", 1_100), undefined);
  assert.equal(cache.get("one", 1_100), "first");
  assert.equal(cache.get("three", 1_100), "third");
});

const identifierHash = "a".repeat(64);
const rule = (overrides: Partial<MemoryRateLimitRule> = {}): MemoryRateLimitRule => ({
  scope: "login-ip",
  identifierHash,
  limit: 2,
  windowMs: 60_000,
  ...overrides,
});

test("memory limiter rejects a local burst and resets at the window boundary", () => {
  const cache = new BoundedMemoryCache<number>({ maxEntries: 100, ttlMs: 60_000 });
  assert.equal(consumeMemoryRateLimits({ cache, rules: [rule()], now: 61_000 }).allowed, true);
  assert.equal(consumeMemoryRateLimits({ cache, rules: [rule()], now: 61_100 }).allowed, true);
  assert.deepEqual(
    consumeMemoryRateLimits({ cache, rules: [rule()], now: 61_200 }),
    { allowed: false, retryAfterSeconds: 59 },
  );
  assert.equal(consumeMemoryRateLimits({ cache, rules: [rule()], now: 120_000 }).allowed, true);
});

test("memory limiter validates every rule before consuming counters", () => {
  const cache = new BoundedMemoryCache<number>({ maxEntries: 100, ttlMs: 60_000 });
  assert.throws(
    () => consumeMemoryRateLimits({ cache, rules: [rule(), rule({ scope: "bad scope" })] }),
    /scope is invalid/,
  );
  assert.equal(cache.size, 0);
});

