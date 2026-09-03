import * as Sentry from "@sentry/nextjs";

// No-op unless SENTRY_DSN is set, so local dev and un-configured deploys carry
// no Sentry overhead. Tracing is sampled low; errors are always sent.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  sendDefaultPii: false,
});
