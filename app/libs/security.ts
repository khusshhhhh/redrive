import crypto from "crypto";
import prisma from "@/app/libs/prismadb";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";
import { consumeMemoryRateLimits } from "@/app/libs/memoryRateLimit";

type RateLimitRule = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const secret = () => process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET || "redrive-development-only";
// This cache is an early-rejection optimisation only. MongoDB remains the
// shared authority across serverless instances, so eviction/restarts cannot
// weaken the real limit. 10,000 integer counters keeps memory use bounded.
const localRateLimitCache = new BoundedMemoryCache<number>({ maxEntries: 10_000, ttlMs: 60 * 60_000 });

export function securityHash(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function consumeRateLimits(rules: RateLimitRule[]) {
  const now = Date.now();
  const hashedRules = rules.map((rule) => ({
    scope: rule.scope,
    identifierHash: securityHash(rule.identifier.toLowerCase()),
    limit: rule.limit,
    windowMs: rule.windowMs,
  }));
  const localResult = consumeMemoryRateLimits({ cache: localRateLimitCache, rules: hashedRules, now });
  if (!localResult.allowed) return localResult;

  return consumeMongoRateLimits(rules, now);
}

async function consumeMongoRateLimits(rules: RateLimitRule[], now: number) {
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

