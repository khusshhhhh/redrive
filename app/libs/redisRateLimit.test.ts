import assert from "node:assert/strict";
import test from "node:test";

import {
  FIXED_WINDOW_RATE_LIMIT_SCRIPT,
  consumeRedisRateLimits,
  redisRateLimitKey,
  type RedisEvalClient,
  type RedisRateLimitRule,
} from "./redisRateLimit";

const identifierHash = "a".repeat(64);

const rule = (overrides: Partial<RedisRateLimitRule> = {}): RedisRateLimitRule => ({
  scope: "login-ip",
  identifierHash,
  limit: 3,
  windowMs: 60_000,
  ...overrides,
});

test("rate-limit keys contain a hashed identifier and fixed window", () => {
  const key = redisRateLimitKey("redrive:test", rule(), 120_000);
  assert.equal(key, `redrive:test:ratelimit:login-ip:${identifierHash}:120000`);
});

test("the Lua script increments and applies expiry atomically", () => {
  assert.match(FIXED_WINDOW_RATE_LIMIT_SCRIPT, /INCR/);
  assert.match(FIXED_WINDOW_RATE_LIMIT_SCRIPT, /PEXPIREAT/);
  assert.match(FIXED_WINDOW_RATE_LIMIT_SCRIPT, /PTTL/);
});

test("allows requests within every configured limit", async () => {
  const calls: Array<{ keys: string[]; arguments: string[] }> = [];
  const client: RedisEvalClient = {
    async eval(_script, options) {
      calls.push(options);
      return [2, 40_000];
    },
  };

  const result = await consumeRedisRateLimits({
    client,
    keyPrefix: "redrive:test",
    now: 125_000,
    rules: [rule(), rule({ scope: "login-account" })],
  });

  assert.deepEqual(result, { allowed: true, retryAfterSeconds: 0 });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].arguments, ["180000"]);
});

test("rejects above the limit and uses Redis TTL for Retry-After", async () => {
  let calls = 0;
  const client: RedisEvalClient = {
    async eval() {
      calls += 1;
      return calls === 1 ? [4, 21_500] : [1, 60_000];
    },
  };

  const result = await consumeRedisRateLimits({
    client,
    keyPrefix: "redrive:test",
    rules: [rule(), rule({ scope: "unused-second-rule" })],
  });

  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 22 });
  assert.equal(calls, 1);
});

test("validates all rules before consuming any counter", async () => {
  let calls = 0;
  const client: RedisEvalClient = {
    async eval() {
      calls += 1;
      return [1, 60_000];
    },
  };

  await assert.rejects(
    consumeRedisRateLimits({
      client,
      keyPrefix: "redrive:test",
      rules: [rule(), rule({ scope: "bad scope" })],
    }),
    /scope is invalid/,
  );
  assert.equal(calls, 0);
});

test("rejects malformed Redis script responses", async () => {
  const client: RedisEvalClient = { async eval() { return "unexpected"; } };
  await assert.rejects(
    consumeRedisRateLimits({ client, keyPrefix: "redrive:test", rules: [rule()] }),
    /invalid rate-limit result/,
  );
});

