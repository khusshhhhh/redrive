import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";
import { recomputeListingRating } from "@/app/libs/listingStats";

/** Days after a trip ends before a one-sided review reveals on its own. */
export const BLIND_REVEAL_DAYS = 14;

/**
 * Recalculate a guest's aggregate rating from their published host→guest
 * reviews and the count of trips they've completed as a guest.
 */
export async function recomputeGuestRating(userId: string): Promise<void> {
  const [agg, tripCount] = await Promise.all([
    prisma.guestReview.aggregate({
      where: { subjectUserId: userId, publishedAt: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.reservation.count({ where: { userId, status: "COMPLETED" } }),
  ]);
  await prisma.user.update({
    where: { id: userId },
    data: {
      guestRatingAvg: agg._count._all ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : null,
      guestRatingCount: agg._count._all,
      tripsAsGuestCompleted: tripCount,
    },
  });
}

/**
 * When both sides of a trip have submitted, or the blind window has passed,
 * publish whatever reviews exist for that reservation and let both parties know.
 * Safe to call repeatedly.
 */
export async function maybePublishTripReviews(
  reservationId: string,
  now = new Date(),
): Promise<boolean> {
  const [guestReview, hostReview, reservation] = await Promise.all([
    prisma.review.findFirst({ where: { reservationId } }),
    prisma.guestReview.findUnique({ where: { reservationId } }),
    prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        userId: true,
        completedAt: true,
        endDate: true,
        listing: { select: { id: true, userId: true } },
      },
    }),
  ]);
  if (!reservation) return false;

  const bothSubmitted = Boolean(guestReview && hostReview);
  const anchor = reservation.completedAt ?? reservation.endDate;
  const windowPassed =
    now.getTime() - anchor.getTime() >= BLIND_REVEAL_DAYS * 86_400_000;
  if (!bothSubmitted && !windowPassed) return false;

  const published: string[] = [];
  if (guestReview && !guestReview.publishedAt) {
    await prisma.review.update({ where: { id: guestReview.id }, data: { publishedAt: now } });
    published.push("guest");
    // The guest→host review is now public — refresh the listing aggregate.
    await recomputeListingRating(reservation.listing.id);
  }
  if (hostReview && !hostReview.publishedAt) {
    await prisma.guestReview.update({ where: { id: hostReview.id }, data: { publishedAt: now } });
    published.push("host");
    await recomputeGuestRating(hostReview.subjectUserId);
  }
  if (published.length === 0) return false;

  try {
    if (guestReview?.publishedAt || published.includes("guest")) {
      await notificationService.notifyReviewPublished(
        reservation.listing.userId,
        "the guest's review",
        `/listings/${reservation.listing.id}`,
        reservationId,
      );
    }
    if (hostReview?.publishedAt || published.includes("host")) {
      await notificationService.notifyReviewPublished(
        reservation.userId,
        "your host's review",
        `/trips`,
        reservationId,
      );
    }
  } catch (error) {
    console.error("Review-published notification failed", reservationId, error);
  }
  return true;
}

/**
 * Lifecycle-cron step: reveal any reviews whose 14-day blind window has closed.
 */
export async function revealDueReviews(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - BLIND_REVEAL_DAYS * 86_400_000);
  const [pendingGuest, pendingHost] = await Promise.all([
    prisma.review.findMany({
      where: { publishedAt: null, reservationId: { not: null }, createdAt: { lt: cutoff } },
      select: { reservationId: true },
      take: 100,
    }),
    prisma.guestReview.findMany({
      where: { publishedAt: null, createdAt: { lt: cutoff } },
      select: { reservationId: true },
      take: 100,
    }),
  ]);
  const reservationIds = Array.from(
    new Set(
      [...pendingGuest, ...pendingHost]
        .map((row) => row.reservationId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  let revealed = 0;
  for (const reservationId of reservationIds) {
    if (await maybePublishTripReviews(reservationId, now)) revealed += 1;
  }
  return revealed;
}
