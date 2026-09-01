import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

async function GETHandler(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const [rateLimits, resetTokens, sessions, mobileSessions, mobileChallenges, idempotencyRecords, licences, apiMetrics, apiErrors, licenceChecks] = await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } }),
    prisma.mobileSession.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } }),
    prisma.mobileAuthChallenge.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.user.updateMany({ where: { licenseExpiresAt: { lt: now }, licenseStatus: "VERIFIED" }, data: { licenseStatus: "EXPIRED", profileVerified: "N" } }),
    prisma.apiMetricBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.apiErrorEvent.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.licenceCheck.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } }),
  ]);
  return NextResponse.json({ cleaned: { rateLimits: rateLimits.count, resetTokens: resetTokens.count, sessions: sessions.count, mobileSessions: mobileSessions.count, mobileChallenges: mobileChallenges.count, idempotencyRecords: idempotencyRecords.count, apiMetrics: apiMetrics.count, apiErrors: apiErrors.count, licenceChecks: licenceChecks.count }, expiredLicences: licences.count });
}

export const GET = monitorApiRoute("/api/cron/security-maintenance", GETHandler, "GET");
