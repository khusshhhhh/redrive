import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { withCronLock } from "@/app/libs/cronLock";

export const maxDuration = 60;

// MongoDB TTL indexes (scripts/create-ttl-indexes.mjs) now auto-expire the
// short-lived collections — RateLimitBucket, BookingQuote, ApiMetricBucket,
// ApiErrorEvent, IdempotencyRecord, BookingLock. This cron only handles the
// collections that keep a deliberate retention window past `expiresAt`, plus
// marking lapsed licences. Independent deletes (no atomicity needed) so the
// job isn't bounded by the 60s multi-document transaction limit.
async function GETHandler(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const run = await withCronLock("cron-security-maintenance", async () => {
    const now = Date.now();
    const [resetTokens, sessions, mobileSessions, mobileChallenges, licenceChecks, pushTokens, expiredLicences] =
      await Promise.all([
        prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now - 7 * 86_400_000) } } }),
        prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date(now - 30 * 86_400_000) } } }),
        prisma.mobileSession.deleteMany({ where: { expiresAt: { lt: new Date(now - 30 * 86_400_000) } } }),
        prisma.mobileAuthChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now - 7 * 86_400_000) } } }),
        prisma.licenceCheck.deleteMany({ where: { expiresAt: { lt: new Date(now - 24 * 60 * 60_000) } } }),
        // Push tokens: drop ones disabled by a failed send, or unseen, for 90+ days.
        prisma.mobilePushToken.deleteMany({
          where: {
            OR: [
              { disabledAt: { lt: new Date(now - 90 * 86_400_000) } },
              { lastSeenAt: { lt: new Date(now - 90 * 86_400_000) } },
            ],
          },
        }),
        prisma.user.updateMany({
          where: { licenseExpiresAt: { lt: new Date(now) }, licenseStatus: "VERIFIED" },
          data: { licenseStatus: "EXPIRED", profileVerified: "N" },
        }),
      ]);

    return {
      cleaned: {
        resetTokens: resetTokens.count,
        sessions: sessions.count,
        mobileSessions: mobileSessions.count,
        mobileChallenges: mobileChallenges.count,
        licenceChecks: licenceChecks.count,
        pushTokens: pushTokens.count,
      },
      expiredLicences: expiredLicences.count,
    };
  });

  if (run.skipped) return NextResponse.json({ skipped: true, reason: "already running" });
  return NextResponse.json(run.result);
}

export const GET = monitorApiRoute("/api/cron/security-maintenance", GETHandler, "GET");
