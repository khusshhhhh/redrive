import * as Sentry from "@sentry/nextjs";
import { logger } from "@/app/libs/logger";

// Single entry point for "something went wrong, someone should know". Always
// logs (structured, via logger.ts); additionally sends to Sentry when a DSN is
// configured. Call this instead of importing Sentry directly so error
// reporting stays swappable and a no-op is safe.

type Context = {
  /** short slug, e.g. "stripe_webhook_failed" */
  event?: string;
  /** extra structured fields for the log line + Sentry `extra` */
  fields?: Record<string, unknown>;
  /** Sentry tags (indexed, filterable) */
  tags?: Record<string, string>;
  /** raise the log level / Sentry level */
  level?: "warning" | "error" | "fatal";
};

export function captureException(error: unknown, context: Context = {}): void {
  const { event = "unhandled_error", fields = {}, tags, level = "error" } = context;

  logger[level === "warning" ? "warn" : "error"](event, { ...fields, err: error });

  Sentry.captureException(error, (scope) => {
    scope.setLevel(level);
    scope.setContext("app", { event, ...fields });
    if (tags) scope.setTags(tags);
    return scope;
  });
}

/** Attach the current user id to the Sentry scope for the rest of the request. */
export function setUserContext(userId: string | null | undefined): void {
  Sentry.setUser(userId ? { id: userId } : null);
}
