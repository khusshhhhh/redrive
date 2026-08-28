import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";
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

async function runNotificationCron() {
  try {
    console.log("🔄 Starting notification cron job...");

    await notificationService.cleanupExpiredNotifications();

    // Send booking reminders for trips starting in 1 day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        startDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        status: "APPROVED",
      },
      include: {
        user: true,
        listing: true,
      },
    });

    console.log(`📅 Found ${upcomingReservations.length} reservations starting tomorrow`);

    for (const reservation of upcomingReservations) {
      try {
        await notificationService.notifyBookingReminder(
          reservation.userId,
          reservation.listing.title,
          reservation.id,
          reservation.startDate
        );
        
        console.log(`✅ Sent reminder to user ${reservation.userId} for reservation ${reservation.id}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder for reservation ${reservation.id}:`, error);
      }
    }

    // Send review reminders for completed trips (after 1 day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(23, 59, 59, 999);

    const twoDaysAgo = new Date(oneDayAgo);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);

    const completedReservations = await prisma.reservation.findMany({
      where: {
        endDate: {
          gte: twoDaysAgo,
          lt: oneDayAgo,
        },
        status: "APPROVED",
      },
      include: {
        user: true,
        listing: true,
      },
    });

    console.log(`📝 Found ${completedReservations.length} recently completed reservations`);

    for (const reservation of completedReservations) {
      try {
        const existingReview = await prisma.review.findUnique({
          where: {
            userId_listingId: {
              userId: reservation.userId,
              listingId: reservation.listingId,
            },
          },
        });

        if (!existingReview) {
          await notificationService.notifyReviewReminder(
            reservation.userId,
            reservation.listing.title,
            reservation.id
          );
          
          console.log(`✅ Sent review reminder to user ${reservation.userId} for reservation ${reservation.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send review reminder for reservation ${reservation.id}:`, error);
      }
    }

    // Deliver opted-in saved-search alerts. Alerts are in-app notifications;
    // email delivery can be added later without changing the saved-search model.
    const now = new Date();
    const savedSearches = await prisma.savedSearch.findMany({ where: { active: true }, take: 200 });
    let savedSearchAlerts = 0;

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
        const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)])).toString();
        await notificationService.notifySystemUpdate(
          savedSearch.userId,
          "New vehicles match your saved search",
          `${matches.length === 4 ? "At least 4" : matches.length} new vehicle${matches.length === 1 ? "" : "s"} match “${savedSearch.name}”.`,
          `/?${query}`,
        );
        savedSearchAlerts += 1;
      }

      await prisma.savedSearch.update({ where: { id: savedSearch.id }, data: { lastNotifiedAt: now } });
    }

    console.log("✅ Notification cron job completed successfully");

    return NextResponse.json({
      success: true,
      message: "Notification cron job completed",
      stats: {
        upcomingReservations: upcomingReservations.length,
        completedReservations: completedReservations.length,
        savedSearchAlerts,
      },
    });

  } catch (error) {
    console.error("❌ Error in notification cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Vercel Cron sends a GET request to the scheduled path.
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
