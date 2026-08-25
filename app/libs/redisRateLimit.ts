export type RedisRateLimitRule = {
  scope: string;
  identifierHash: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export interface RedisEvalClient {
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
}

// PEXPIREAT is intentionally inside the script. A separate INCR then EXPIRE
// can leak a counter forever if the process fails between the two commands.
export const FIXED_WINDOW_RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
redis.call("PEXPIREAT", KEYS[1], ARGV[1])
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

function validateRule(rule: RedisRateLimitRule) {
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

export function redisRateLimitKey(prefix: string, rule: RedisRateLimitRule, windowStart: number) {
  return `${prefix}:ratelimit:${rule.scope}:${rule.identifierHash}:${windowStart}`;
}

function parseScriptResult(result: unknown) {
  if (!Array.isArray(result) || result.length !== 2) {
    throw new Error("Redis returned an invalid rate-limit result");
  }

  const count = Number(result[0]);
  const ttlMs = Number(result[1]);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs)) {
    throw new Error("Redis returned invalid rate-limit counter values");
  }

  return { count, ttlMs };
}

export async function consumeRedisRateLimits(input: {
  client: RedisEvalClient;
  rules: RedisRateLimitRule[];
  keyPrefix: string;
  now?: number;
}): Promise<RateLimitResult> {
  const now = input.now ?? Date.now();
  input.rules.forEach(validateRule);

  for (const rule of input.rules) {
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const expiresAt = windowStart + rule.windowMs;
    const key = redisRateLimitKey(input.keyPrefix, rule, windowStart);
    const result = parseScriptResult(await input.client.eval(FIXED_WINDOW_RATE_LIMIT_SCRIPT, {
      keys: [key],
      arguments: [String(expiresAt)],
    }));

    if (result.count > rule.limit) {
      const retryAfterMs = result.ttlMs > 0 ? result.ttlMs : expiresAt - now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1_000)),
      };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

