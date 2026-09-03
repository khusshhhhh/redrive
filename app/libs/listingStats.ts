import prisma from "@/app/libs/prismadb";
import type { Prisma } from "@prisma/client";

// Keep the denormalised aggregates on Listing / User fresh. Called from the
// handful of write paths that change them (review created / revealed, host
// responds to a request) so listing search reads a stored number instead of
// loading every review + 20 reservations per row.

/** Predicate for the reviews a listing card / review list actually shows. */
const publicReviewWhere = (listingId: string): Prisma.ReviewWhereInput => ({
  listingId,
  OR: [
    { publishedAt: { not: null } },
    { reservationId: null },
    { reservationId: { isSet: false } },
  ],
});

export async function recomputeListingRating(listingId: string): Promise<void> {
  try {
    const agg = await prisma.review.aggregate({
      where: publicReviewWhere(listingId),
      _avg: { rating: true },
      _count: true,
    });
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        reviewAverage: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    });
  } catch (error) {
    console.error("recomputeListingRating failed", listingId, error);
  }
}

export async function recomputeHostResponseTime(hostUserId: string): Promise<void> {
  try {
    const rows = await prisma.reservation.findMany({
      where: { listing: { userId: hostUserId }, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
      orderBy: { respondedAt: "desc" },
      take: 20,
    });
    const hours = rows
      .map((row) =>
        row.respondedAt
          ? Math.max(0, (row.respondedAt.getTime() - row.createdAt.getTime()) / 3_600_000)
          : null,
      )
      .filter((value): value is number => value !== null);

    const average = hours.length
      ? Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10
      : null;

    await prisma.user.update({
      where: { id: hostUserId },
      data: { responseTimeHours: average },
    });
  } catch (error) {
    console.error("recomputeHostResponseTime failed", hostUserId, error);
  }
}
