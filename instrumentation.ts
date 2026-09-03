import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Fail a misconfigured production boot loudly (see app/libs/env.ts).
  const { validateServerEnv } = await import("@/app/libs/env");
  validateServerEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Report React Server Component / route-handler errors Next surfaces here.
export const onRequestError = Sentry.captureRequestError;
