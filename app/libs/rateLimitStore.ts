import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Shared-state rate limiting on Upstash Redis when it's configured, so the hot
// path (login, reservation, quote, uploads) does one atomic Redis op instead of
// a Mongo upsert per rule. When the env vars are absent, `consumeRateLimits` in
// security.ts keeps using the in-memory + MongoDB path unchanged.

export function redisRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function limiterFor(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  if (!redis) redis = Redis.fromEnv();
  const created = new Ratelimit({
    redis,
    // Fixed window matches the semantics of the MongoDB bucket it replaces.
    limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
    prefix: "rl",
    analytics: false,
  });
  limiters.set(key, created);
  return created;
}

export interface RedisRateRule {
  scope: string;
  /** Already HMAC-hashed — never a raw email / IP. */
  identifierHash: string;
  limit: number;
  windowMs: number;
}

/**
 * Consume all rules against Redis. Returns the first rule that trips, or
 * `{ allowed: true }`. Never throws — a Redis outage falls back to "allowed"
 * (the caller can still layer MongoDB behind this if it wants belt-and-braces).
 */
export async function consumeRedisRateLimits(
  rules: RedisRateRule[],
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    for (const rule of rules) {
      const { success, reset } = await limiterFor(rule.limit, rule.windowMs).limit(
        `${rule.scope}:${rule.identifierHash}`,
      );
      if (!success) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
        };
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("Redis rate-limit check failed; allowing request", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
