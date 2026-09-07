import { logger } from "@/app/libs/logger";

// Fail fast on a misconfigured production boot instead of silently degrading
// (e.g. rate-limit HMAC keys falling back to a public constant). Called once
// from instrumentation.ts `register()`.

function isProduction(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL))
  );
}

const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

// Present-but-optional: a production boot without these still works, but it's
// almost certainly a misconfiguration. Logged loudly (stdout reaches Vercel
// logs even when Sentry itself is the thing that's missing) rather than thrown,
// so a forgotten var can't take the whole deploy down. Promote to
// REQUIRED_IN_PRODUCTION once every environment reliably sets them.
const EXPECTED_IN_PRODUCTION = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function validateServerEnv(): void {
  if (!isProduction()) return;

  const missing: string[] = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());

  const unexpectedlyMissing = EXPECTED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (unexpectedlyMissing.length > 0) {
    logger.warn("env_expected_missing", {
      missing: unexpectedlyMissing,
      note: "production is running without error tracking / payments / cron auth configured",
    });
  }

  // The rate-limit HMAC secret chain: RATE_LIMIT_SECRET || NEXTAUTH_SECRET.
  // If NEXTAUTH_SECRET is present that's fine; the hardcoded fallback in
  // security.ts must never be reached in production.
  if (!process.env.RATE_LIMIT_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    missing.push("RATE_LIMIT_SECRET or NEXTAUTH_SECRET");
  }

  if (missing.length > 0) {
    const message = `Missing required production environment: ${missing.join(", ")}`;
    logger.error("env_validation_failed", { missing });
    throw new Error(message);
  }
}
