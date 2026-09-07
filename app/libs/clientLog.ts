// Browser-side counterpart to logger.ts. The structured server logger writes to
// process.stdout, which doesn't exist in the browser, so client components use
// this instead of a bare console.* call.
//
// In development it prints to the console as before. In production it stays
// quiet in the user's console and instead feeds Sentry (a no-op when no DSN is
// configured), so client-side failures are still visible to us without shipping
// noise to end users.

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

type Fields = Record<string, unknown>;

export const clientLog = {
  warn(message: string, fields?: Fields): void {
    if (isDev) console.warn(message, fields ?? "");
    Sentry.addBreadcrumb({ level: "warning", category: "client", message, data: fields });
  },

  error(message: string, error?: unknown, fields?: Fields): void {
    if (isDev) console.error(message, error ?? "", fields ?? "");
    if (error !== undefined && error !== null) {
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        extra: { message, ...fields },
      });
    } else {
      Sentry.captureMessage(message, "error");
    }
  },
};

export default clientLog;
