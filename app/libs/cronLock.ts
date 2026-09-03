import * as Sentry from "@sentry/nextjs";
import prisma from "@/app/libs/prismadb";
import { logger } from "@/app/libs/logger";
import { captureException } from "@/app/libs/observability";

// A run older than this with no `finishedAt` is presumed dead and its lock can
// be reclaimed by the next invocation.
const STALE_AFTER_MS = 10 * 60_000;

interface CronResult<T> {
  skipped: boolean;
  result?: T;
}

/**
 * Wrap a cron handler so:
 *  - a second invocation while one is still running is skipped (overlap guard),
 *  - the last run's status/error is recorded (`CronRun`),
 *  - failures go to Sentry with a `cron` tag,
 *  - Sentry's cron monitoring gets a check-in (missed-run alerting) when a DSN
 *    is configured.
 */
export async function withCronLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<CronResult<T>> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);

  // Claim: take the row iff it's finished or its running claim is stale.
  const claimed = await prisma.cronRun.updateMany({
    where: {
      name,
      OR: [{ finishedAt: { not: null } }, { startedAt: { lt: staleBefore } }],
    },
    data: { startedAt: now, finishedAt: null, status: "RUNNING", error: null },
  });

  if (claimed.count === 0) {
    // Either the row doesn't exist yet, or a live run holds it.
    const created = await prisma.cronRun
      .create({ data: { name, startedAt: now, status: "RUNNING" } })
      .catch(() => null);
    if (!created) {
      logger.warn("cron_skipped_overlap", { cron: name });
      return { skipped: true };
    }
  }

  const checkInId = Sentry.captureCheckIn({ monitorSlug: name, status: "in_progress" });

  try {
    const result = await fn();
    await prisma.cronRun
      .update({ where: { name }, data: { finishedAt: new Date(), status: "OK", error: null } })
      .catch(() => undefined);
    Sentry.captureCheckIn({ checkInId, monitorSlug: name, status: "ok" });
    return { skipped: false, result };
  } catch (error) {
    await prisma.cronRun
      .update({
        where: { name },
        data: { finishedAt: new Date(), status: "ERROR", error: String(error).slice(0, 800) },
      })
      .catch(() => undefined);
    Sentry.captureCheckIn({ checkInId, monitorSlug: name, status: "error" });
    captureException(error, { event: "cron_failed", tags: { cron: name } });
    throw error;
  }
}
