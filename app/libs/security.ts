import crypto from "crypto";
import prisma from "@/app/libs/prismadb";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";
import { consumeMemoryRateLimits } from "@/app/libs/memoryRateLimit";
import { consumeRedisRateLimits, redisRateLimitConfigured } from "@/app/libs/rateLimitStore";
import { logger } from "@/app/libs/logger";

type RateLimitRule = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const secret = () => {
  const configured = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SECRET or NEXTAUTH_SECRET must be set in production");
  }
  return "redrive-development-only";
};
// This cache is an early-rejection optimisation only. MongoDB remains the
// shared authority across serverless instances, so eviction/restarts cannot
// weaken the real limit. 10,000 integer counters keeps memory use bounded.
const localRateLimitCache = new BoundedMemoryCache<number>({ maxEntries: 10_000, ttlMs: 60 * 60_000 });

export function securityHash(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function getClientIp(request: Request) {
  // Prefer the headers the hosting platform sets from the real connection —
  // a client can prepend a spoofed hop to `x-forwarded-for`, but not to
  // `x-vercel-forwarded-for` / `x-real-ip`, which the edge overwrites.
  const trusted =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  if (trusted) return trusted;

  // Self-hosted / non-Vercel fallback. The left-most entry is the original
  // client only if every proxy in front is trusted to rewrite the header.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function consumeRateLimits(rules: RateLimitRule[]) {
  const now = Date.now();
  const hashedRules = rules.map((rule) => ({
    scope: rule.scope,
    identifierHash: securityHash(rule.identifier.toLowerCase()),
    limit: rule.limit,
    windowMs: rule.windowMs,
  }));

  // Local burst filter always runs first — it's free and rejects obvious floods
  // before any network hop.
  const localResult = consumeMemoryRateLimits({ cache: localRateLimitCache, rules: hashedRules, now });
  if (!localResult.allowed) return localResult;

  // Shared authority: Upstash Redis when configured (one atomic op per rule),
  // otherwise the MongoDB bucket path.
  if (redisRateLimitConfigured()) {
    return consumeRedisRateLimits(hashedRules);
  }

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

// Actions whose audit record is security-relevant: a lost write here is
// escalated to the error tracker, not merely logged. Matched as a prefix so
// families like LICENCE_VERIFIED / LICENCE_REJECTED are all covered.
const CRITICAL_AUDIT_PREFIXES = [
  "PASSWORD_",
  "LOGIN_OTP_",
  "LICENCE_",
  "ACCOUNT_DELETION",
  "ACCOUNT_DELETED",
  "ACCOUNT_CREATED",
  "EMAIL_VERIFIED",
  "LEGACY_API_LOGIN",
  "MOBILE_LOGIN",
  "MOBILE_LOGOUT",
  "MOBILE_SESSION_REVOKED",
  "PAYMENT_",
  "PAYOUT",
  "ROLE_",
  "TRIP_EXTENSION_CHECKOUT",
];

function isCriticalAuditAction(action: string): boolean {
  return CRITICAL_AUDIT_PREFIXES.some((prefix) => action.startsWith(prefix));
}

export async function writeAuditEvent(input: {
  request?: Request;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  /**
   * Force security-relevant treatment. Most callers don't need this — the
   * action name is matched against CRITICAL_AUDIT_PREFIXES automatically. Set
   * it explicitly only for an action whose name doesn't carry a known prefix.
   */
  critical?: boolean;
}) {
  const critical = input.critical || isCriticalAuditAction(input.action);
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
    logger.error("audit_event_write_failed", {
      err: error,
      action: input.action,
      targetType: input.targetType,
      critical,
    });
    if (critical) {
      // Lazy import keeps @sentry/nextjs out of the module graph for unit tests
      // that pull security.ts in through the account-deletion chain.
      try {
        const { captureException } = await import("@/app/libs/observability");
        captureException(error, {
          event: "audit_event_write_failed",
          fields: { action: input.action, targetType: input.targetType, targetId: input.targetId },
          tags: { audit: "critical" },
        });
      } catch {
        // Never let alerting failure mask the original operation.
      }
    }
  }
}

