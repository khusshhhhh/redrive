import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";
import { runLifecycleSweep } from "@/app/libs/notifications/lifecycle";
import { withCronLock } from "@/app/libs/cronLock";
import { cleanSavedSearchFilters, savedSearchFiltersToQuery } from "@/app/libs/savedSearch";
import type { Prisma } from "@prisma/client";

// Vercel Cron (and any manual trigger) must present this as
// `Authorization: Bearer <CRON_SECRET>`. Vercel adds this header
// automatically when a `CRON_SECRET` env var is set on the project.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

async function runSavedSearchAlerts(now: Date) {
  const savedSearches = await prisma.savedSearch.findMany({ where: { active: true }, take: 200 });
  let alerts = 0;

  for (const savedSearch of savedSearches) {
    const intervalMs = savedSearch.alertFrequency === "DAILY" ? 86_400_000 : 7 * 86_400_000;
    const lastScan = savedSearch.lastNotifiedAt || savedSearch.createdAt;
    if (now.getTime() - lastScan.getTime() < intervalMs) continue;

    const filters = cleanSavedSearchFilters(savedSearch.filters);
    const where = {
      ...savedSearchFiltersToQuery(filters),
      userId: { not: savedSearch.userId },
      createdAt: { gt: lastScan },
    } as Prisma.ListingWhereInput;
    const matches = await prisma.listing.findMany({ where, select: { id: true }, take: 4 });

    if (matches.length > 0) {
      const query = new URLSearchParams(
        Object.entries(filters).map(([key, value]) => [key, String(value)]),
      ).toString();
      await notificationService.notifySystemUpdate(
        savedSearch.userId,
        "New vehicles match your saved search",
        `${matches.length === 4 ? "At least 4" : matches.length} new vehicle${matches.length === 1 ? "" : "s"} match “${savedSearch.name}”.`,
        `/?${query}`,
      );
      alerts += 1;
    }

    await prisma.savedSearch.update({ where: { id: savedSearch.id }, data: { lastNotifiedAt: now } });
  }
  return alerts;
}

async function runNotificationCron() {
  const now = new Date();
  const run = await withCronLock("cron-notifications", async () => {
    await notificationService.cleanupExpiredNotifications();
    const lifecycle = await runLifecycleSweep(now);
    const savedSearchAlerts = await runSavedSearchAlerts(now);
    return { lifecycle, savedSearchAlerts };
  });

  if (run.skipped) return NextResponse.json({ skipped: true, reason: "already running" });
  return NextResponse.json({ success: true, ranAt: now.toISOString(), ...run.result });
}

// Vercel Cron sends a GET request to the scheduled path.
export const maxDuration = 60;

async function GETHandler(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNotificationCron();
}

// Also allow POST for manual/external triggering with the same secret.
async function POSTHandler(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNotificationCron();
}

export const GET = monitorApiRoute("/api/cron/notifications", GETHandler, "GET");

export const POST = monitorApiRoute("/api/cron/notifications", POSTHandler, "POST");
