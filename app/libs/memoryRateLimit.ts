import { BoundedMemoryCache } from "@/app/libs/memoryCache";

export type MemoryRateLimitRule = {
  scope: string;
  identifierHash: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function validateRule(rule: MemoryRateLimitRule) {
  if (!rule.scope || !/^[A-Za-z0-9:_-]{1,120}$/.test(rule.scope)) {
    throw new Error("Rate-limit scope is invalid");
  }
  if (!/^[a-f0-9]{64}$/.test(rule.identifierHash)) {
    throw new Error("Rate-limit identifiers must be SHA-256 HMAC hashes");
  }
  if (!Number.isSafeInteger(rule.limit) || rule.limit < 1) {
    throw new Error("Rate-limit limit must be a positive integer");
  }
  if (!Number.isSafeInteger(rule.windowMs) || rule.windowMs < 1_000) {
    throw new Error("Rate-limit window must be at least one second");
  }
}

export function consumeMemoryRateLimits(input: {
  cache: BoundedMemoryCache<number>;
  rules: MemoryRateLimitRule[];
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  input.rules.forEach(validateRule);

  for (const rule of input.rules) {
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const expiresAt = windowStart + rule.windowMs;
    const key = `${rule.scope}:${rule.identifierHash}:${windowStart}`;
    const count = (input.cache.get(key, now) || 0) + 1;
    input.cache.set(key, count, expiresAt - now, now);

    if (count > rule.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1_000)),
      };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

