import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";

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

    // Clean up expired notifications
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

    // Send reminders
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

    // Send review reminders if no review exists
    for (const reservation of completedReservations) {
      try {
        // Check if user has already reviewed
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

    console.log("✅ Notification cron job completed successfully");

    return NextResponse.json({
      success: true,
      message: "Notification cron job completed",
      stats: {
        upcomingReservations: upcomingReservations.length,
        completedReservations: completedReservations.length,
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
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNotificationCron();
}

// Also allow POST for manual/external triggering with the same secret.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runNotificationCron();
}