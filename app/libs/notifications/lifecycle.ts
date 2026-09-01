import prisma from "@/app/libs/prismadb";
import { revealDueReviews } from "@/app/libs/reviews";
import { notificationService } from "@/app/services/notificationService";

const HOUR = 3_600_000;
const DAY = 86_400_000;

const PAID = ["PAID_HELD", "RELEASED"];

async function mark(reservationId: string, key: string) {
  try {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { remindersSent: { push: key } },
    });
  } catch (error) {
    console.error("Could not record reminder", reservationId, key, error);
  }
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface LifecycleStats {
  autoDeclined: number;
  hostNudges: number;
  paymentWarnings: number;
  pickupReminders: number;
  returnReminders: number;
  handoverEscalations: number;
  reviewReminders: number;
  reviewsRevealed: number;
  licenceNotices: number;
  hostStatements: number;
  dormantListings: number;
  drips: number;
}

/**
 * One idempotent pass over every booking that needs a nudge. Safe to run
 * hourly: each reservation carries a `remindersSent` list so a given nudge
 * fires once, and the notification layer de-dupes email / push / SMS on top.
 */
export async function runLifecycleSweep(now = new Date()): Promise<LifecycleStats> {
  const stats: LifecycleStats = {
    autoDeclined: 0,
    hostNudges: 0,
    paymentWarnings: 0,
    pickupReminders: 0,
    returnReminders: 0,
    handoverEscalations: 0,
    reviewReminders: 0,
    reviewsRevealed: 0,
    licenceNotices: 0,
    hostStatements: 0,
    dormantListings: 0,
    drips: 0,
  };

  // 1. Auto-decline unanswered requests, freeing the calendar.
  const stale = await prisma.reservation.findMany({
    where: { status: "REVIEWING", autoDeclineAt: { lte: now } },
    take: 50,
    include: { listing: { select: { title: true, userId: true } } },
  });
  for (const reservation of stale) {
    try {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "DECLINED", respondedAt: now },
      });
      await notificationService.notifyRequestExpired(
        reservation.userId,
        reservation.listing.title,
        reservation.id,
        "GUEST",
      );
      await notificationService.notifyRequestExpired(
        reservation.listing.userId,
        reservation.listing.title,
        reservation.id,
        "HOST",
      );
      stats.autoDeclined += 1;
    } catch (error) {
      console.error("Auto-decline failed", reservation.id, error);
    }
  }

  // 2. Nudge hosts sitting on an open request.
  const pending = await prisma.reservation.findMany({
    where: { status: "REVIEWING" },
    take: 100,
    include: { user: { select: { name: true } }, listing: { select: { title: true, userId: true } } },
  });
  for (const reservation of pending) {
    const ageHours = (now.getTime() - reservation.createdAt.getTime()) / HOUR;
    for (const [threshold, key] of [
      [6, "host-nudge-6"],
      [18, "host-nudge-18"],
    ] as const) {
      if (ageHours >= threshold && !reservation.remindersSent.includes(key)) {
        await notificationService.notifyBookingRequest(
          reservation.listing.userId,
          reservation.user.name || "A guest",
          reservation.listing.title,
          reservation.id,
          key,
        );
        await mark(reservation.id, key);
        stats.hostNudges += 1;
      }
    }
  }

  // 3. Payment window closing.
  const awaitingPayment = await prisma.reservation.findMany({
    where: {
      status: "APPROVED",
      paymentStatus: { notIn: ["PAID_HELD", "RELEASED"] },
      paymentDueAt: { gt: now },
    },
    take: 100,
    include: { listing: { select: { title: true } } },
  });
  for (const reservation of awaitingPayment) {
    if (!reservation.paymentDueAt) continue;
    const hoursLeft = (reservation.paymentDueAt.getTime() - now.getTime()) / HOUR;
    if (hoursLeft <= 12 && hoursLeft > 3 && !reservation.remindersSent.includes("pay-12")) {
      await notificationService.notifyPaymentWindowClosing(
        reservation.userId,
        reservation.listing.title,
        reservation.id,
        12,
      );
      await mark(reservation.id, "pay-12");
      stats.paymentWarnings += 1;
    }
    if (hoursLeft <= 3 && !reservation.remindersSent.includes("pay-3")) {
      await notificationService.notifyPaymentWindowClosing(
        reservation.userId,
        reservation.listing.title,
        reservation.id,
        Math.max(1, Math.round(hoursLeft)),
      );
      await mark(reservation.id, "pay-3");
      stats.paymentWarnings += 1;
    }
  }

  // 4. Pickup reminders for paid, upcoming trips (guest + host).
  const upcoming = await prisma.reservation.findMany({
    where: {
      paymentStatus: { in: PAID },
      status: { in: ["APPROVED", "ACTIVE"] },
      startDate: { gte: new Date(now.getTime() - DAY), lte: new Date(now.getTime() + 3 * DAY) },
    },
    take: 100,
    include: { listing: { select: { title: true, userId: true } } },
  });
  for (const reservation of upcoming) {
    const hoursToStart = (reservation.startDate.getTime() - now.getTime()) / HOUR;
    for (const [within, key] of [
      [48, "pickup-48"],
      [8, "pickup-day"],
    ] as const) {
      if (hoursToStart <= within && hoursToStart > -12 && !reservation.remindersSent.includes(key)) {
        await notificationService.notifyBookingReminder(
          reservation.userId,
          reservation.listing.title,
          reservation.id,
          reservation.startDate,
          "GUEST",
          key,
        );
        await notificationService.notifyBookingReminder(
          reservation.listing.userId,
          reservation.listing.title,
          reservation.id,
          reservation.startDate,
          "HOST",
          key,
        );
        await mark(reservation.id, key);
        stats.pickupReminders += 1;
      }
    }
  }

  // 5. Return reminders + handover escalation.
  const ending = await prisma.reservation.findMany({
    where: {
      paymentStatus: { in: PAID },
      status: { in: ["APPROVED", "ACTIVE", "COMPLETED"] },
      endDate: { gte: new Date(now.getTime() - 5 * DAY), lte: new Date(now.getTime() + 2 * DAY) },
    },
    take: 100,
    include: { listing: { select: { title: true, userId: true } } },
  });
  for (const reservation of ending) {
    const hoursToEnd = (reservation.endDate.getTime() - now.getTime()) / HOUR;

    if (hoursToEnd <= 24 && hoursToEnd > 0 && !reservation.remindersSent.includes("return-24")) {
      for (const uid of [reservation.userId, reservation.listing.userId]) {
        await notificationService.notifyHandoverAction(
          uid,
          reservation.listing.title,
          reservation.id,
          "RETURN",
          false,
        );
      }
      await mark(reservation.id, "return-24");
      stats.returnReminders += 1;
    }

    if (reservation.status !== "COMPLETED" && hoursToEnd < 0) {
      const returnReport = await prisma.handoverReport.findUnique({
        where: { reservationId_phase: { reservationId: reservation.id, phase: "RETURN" } },
        select: { status: true },
      });
      const agreed = returnReport?.status === "AGREED";
      if (!agreed) {
        const hoursOverdue = -hoursToEnd;
        for (const [after, key] of [
          [2, "return-overdue-2"],
          [24, "return-overdue-24"],
          [48, "return-overdue-48"],
        ] as const) {
          if (hoursOverdue >= after && !reservation.remindersSent.includes(key)) {
            for (const uid of [reservation.userId, reservation.listing.userId]) {
              await notificationService.notifyHandoverAction(
                uid,
                reservation.listing.title,
                reservation.id,
                "RETURN",
                true,
                key,
              );
            }
            await mark(reservation.id, key);
            stats.handoverEscalations += 1;
          }
        }
      }
    }
  }

  // 6. Review reminders for completed trips.
  const completed = await prisma.reservation.findMany({
    where: {
      status: "COMPLETED",
      completedAt: {
        gte: new Date(now.getTime() - 5 * DAY),
        lte: new Date(now.getTime() - 20 * HOUR),
      },
    },
    take: 100,
    include: { listing: { select: { title: true, userId: true } } },
  });
  for (const reservation of completed) {
    if (reservation.remindersSent.includes("review-req")) continue;
    const [guestReview, hostReview] = await Promise.all([
      prisma.review.findFirst({
        where: { userId: reservation.userId, listingId: reservation.listingId },
        select: { id: true },
      }),
      prisma.guestReview.findUnique({
        where: { reservationId: reservation.id },
        select: { id: true },
      }),
    ]);
    if (!guestReview) {
      await notificationService.notifyReviewReminder(
        reservation.userId,
        reservation.listing.title,
        reservation.id,
        "GUEST",
      );
      stats.reviewReminders += 1;
    }
    if (!hostReview) {
      await notificationService.notifyReviewReminder(
        reservation.listing.userId,
        reservation.listing.title,
        reservation.id,
        "HOST",
      );
      stats.reviewReminders += 1;
    }
    await mark(reservation.id, "review-req");
  }

  // 6b. Reveal one-sided reviews whose 14-day blind window has closed.
  stats.reviewsRevealed = await revealDueReviews(now);

  // 6c. Expire stale trip-extension requests.
  await prisma.tripExtension.updateMany({
    where: { status: { in: ["PENDING", "APPROVED"] }, expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  // 6c. Nudge hosts whose listing has been up a while with no booking.
  if (now.getUTCHours() === 9) {
    const dormant = await prisma.listing.findMany({
      where: { createdAt: { lt: new Date(now.getTime() - 45 * DAY) }, reservations: { none: {} } },
      take: 50,
      select: { id: true, title: true, userId: true, createdAt: true },
    });
    for (const listing of dormant) {
      const daysListed = Math.round((now.getTime() - listing.createdAt.getTime()) / DAY);
      const result = await notificationService.notifyListingDormant(
        listing.userId,
        listing.title,
        listing.id,
        daysListed,
      );
      if (result.inApp) stats.dormantListings += 1;
    }
  }

  // 7. Driver-licence expiry warnings.
  const expiringSoon = await prisma.user.findMany({
    where: {
      licenseStatus: "VERIFIED",
      licenseExpiresAt: { not: null, lte: new Date(now.getTime() + 30 * DAY) },
    },
    take: 200,
    select: { id: true, licenseExpiresAt: true, licenseExpiryNoticeState: true },
  });
  for (const user of expiringSoon) {
    if (!user.licenseExpiresAt) continue;
    const daysLeft = Math.ceil((user.licenseExpiresAt.getTime() - now.getTime()) / DAY);
    const key = daysLeft <= 0 ? "expired" : daysLeft <= 7 ? "T-7" : "T-30";
    if (user.licenseExpiryNoticeState.includes(key)) continue;
    await notificationService.notifyLicenceExpiring(user.id, daysLeft, user.licenseExpiresAt);
    await prisma.user.update({
      where: { id: user.id },
      data: { licenseExpiryNoticeState: { push: key } },
    });
    stats.licenceNotices += 1;
  }

  // 7b. Lifecycle drips — run once a day.
  if (now.getUTCHours() === 9) {
    // Host onboarding: has a listing that's been up ~2 days, not yet nudged.
    const newHostListings = await prisma.listing.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 5 * DAY),
          lt: new Date(now.getTime() - 2 * DAY),
        },
      },
      select: { userId: true },
      take: 100,
    });
    const hostIds = Array.from(new Set(newHostListings.map((listing) => listing.userId)));
    for (const hostId of hostIds) {
      const host = await prisma.user.findUnique({
        where: { id: hostId },
        select: { lifecycleEmailsSent: true },
      });
      if (host && !host.lifecycleEmailsSent.includes("onboard-host-1")) {
        await notificationService.sendHostOnboarding(hostId);
        await prisma.user.update({
          where: { id: hostId },
          data: { lifecycleEmailsSent: { push: "onboard-host-1" } },
        });
        stats.drips += 1;
      }
    }

    // Guest onboarding: signed up ~3 days ago, no listing, no booking, not nudged.
    const newGuests = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 6 * DAY),
          lt: new Date(now.getTime() - 3 * DAY),
        },
        listings: { none: {} },
        reservations: { none: {} },
        NOT: { lifecycleEmailsSent: { has: "onboard-guest-1" } },
      },
      select: { id: true },
      take: 100,
    });
    for (const guest of newGuests) {
      await notificationService.sendGuestOnboarding(guest.id);
      await prisma.user.update({
        where: { id: guest.id },
        data: { lifecycleEmailsSent: { push: "onboard-guest-1" } },
      });
      stats.drips += 1;
    }

    // Re-engagement: consented, inactive 45+ days, not re-engaged in 60 days.
    const dormantUsers = await prisma.user.findMany({
      where: {
        marketingEmailConsent: true,
        lastActiveAt: { lt: new Date(now.getTime() - 45 * DAY) },
        OR: [
          { lastReengagedAt: null },
          { lastReengagedAt: { lt: new Date(now.getTime() - 60 * DAY) } },
        ],
      },
      select: { id: true, state: true },
      take: 50,
    });
    for (const user of dormantUsers) {
      const nearby = user.state
        ? await prisma.listing.count({ where: { state: user.state } })
        : await prisma.listing.count();
      await notificationService.sendReengagement(user.id, nearby, user.state);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastReengagedAt: now },
      });
      stats.drips += 1;
    }
  }

  // 8. Monthly host statement — only in the first two days of the month.
  if (now.getUTCDate() <= 2) {
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const key = monthKey(lastMonthStart);
    const label = monthLabel(lastMonthStart);

    const trips = await prisma.reservation.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      select: { totalPrice: true, listing: { select: { userId: true } } },
    });
    const byHost = new Map<string, { trips: number; earnings: number }>();
    for (const trip of trips) {
      const entry = byHost.get(trip.listing.userId) ?? { trips: 0, earnings: 0 };
      entry.trips += 1;
      entry.earnings += trip.totalPrice;
      byHost.set(trip.listing.userId, entry);
    }
    for (const [hostId, summary] of byHost) {
      const host = await prisma.user.findUnique({
        where: { id: hostId },
        select: { lastHostStatementMonth: true },
      });
      if (host?.lastHostStatementMonth === key) continue;
      await notificationService.notifyHostStatement(hostId, label, summary.trips, summary.earnings);
      await prisma.user.update({
        where: { id: hostId },
        data: { lastHostStatementMonth: key },
      });
      stats.hostStatements += 1;
    }
  }

  return stats;
}
