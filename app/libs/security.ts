import crypto from "crypto";
import prisma from "@/app/libs/prismadb";
import { getRedis, redisEnabled, redisKeyPrefix } from "@/app/libs/redis";
import { consumeRedisRateLimits } from "@/app/libs/redisRateLimit";

type RateLimitRule = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const secret = () => process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET || "redrive-development-only";
const REDIS_RETRY_COOLDOWN_MS = 5_000;
let redisRetryAfter = 0;

export function securityHash(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function consumeRateLimits(rules: RateLimitRule[]) {
  if (redisEnabled() && Date.now() >= redisRetryAfter) {
    try {
      const client = await getRedis();
      const result = await consumeRedisRateLimits({
        client,
        keyPrefix: redisKeyPrefix(),
        rules: rules.map((rule) => ({
          scope: rule.scope,
          identifierHash: securityHash(rule.identifier.toLowerCase()),
          limit: rule.limit,
          windowMs: rule.windowMs,
        })),
      });
      redisRetryAfter = 0;
      return result;
    } catch (error) {
      redisRetryAfter = Date.now() + REDIS_RETRY_COOLDOWN_MS;
      const message = error instanceof Error ? error.message : "Unknown Redis error";
      console.error("Redis rate limiting unavailable; using MongoDB fallback:", message);
    }
  }

  return consumeMongoRateLimits(rules);
}

async function consumeMongoRateLimits(rules: RateLimitRule[]) {
  const now = Date.now();

  for (const rule of rules) {
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const key = `${rule.scope}:${securityHash(rule.identifier.toLowerCase())}:${windowStart}`;
    const expiresAt = new Date(windowStart + rule.windowMs);

    const bucket = await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, expiresAt, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    if (bucket.count > rule.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}

export async function writeAuditEvent(input: {
  request?: Request;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        actorUserId: input.actorUserId || null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        reason: input.reason || null,
        metadata: input.metadata,
        ipHash: input.request ? securityHash(getClientIp(input.request)) : null,
        userAgent: input.request?.headers.get("user-agent")?.slice(0, 500) || null,
      },
    });
  } catch (error) {
    console.error("Audit event write failed", error);
  }
}

