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

export function validateServerEnv(): void {
  if (!isProduction()) return;

  const missing: string[] = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());

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
