#!/usr/bin/env node
/**
 * Populate the denormalised aggregates added for #24:
 *   Listing.reviewAverage / reviewCount   (public reviews only)
 *   User.responseTimeHours                 (hosts: avg of last 20 responses)
 *
 *   node scripts/backfill-listing-stats.mjs [--dry]
 *
 * Idempotent. Run once after `prisma db push` and `prisma generate`. After
 * this, the write-time updates in libs/listingStats.ts keep them fresh.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const publicReviewWhere = (listingId) => ({
  listingId,
  OR: [
    { publishedAt: { not: null } },
    { reservationId: null },
    { reservationId: { isSet: false } },
  ],
});

async function backfillListingRatings() {
  const listings = await prisma.listing.findMany({ select: { id: true } });
  let updated = 0;
  for (const { id } of listings) {
    const agg = await prisma.review.aggregate({
      where: publicReviewWhere(id),
      _avg: { rating: true },
      _count: true,
    });
    const data = {
      reviewAverage: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    };
    if (!DRY) await prisma.listing.update({ where: { id }, data });
    updated += 1;
  }
  console.log(`${DRY ? "[dry] " : ""}listings: ${updated} rated`);
}

async function backfillHostResponseTimes() {
  const hosts = await prisma.listing.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  let updated = 0;
  for (const { userId } of hosts) {
    const rows = await prisma.reservation.findMany({
      where: { listing: { userId }, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
      orderBy: { respondedAt: "desc" },
      take: 20,
    });
    const hours = rows
      .map((r) =>
        r.respondedAt ? Math.max(0, (r.respondedAt.getTime() - r.createdAt.getTime()) / 3_600_000) : null,
      )
      .filter((v) => v !== null);
    const average = hours.length
      ? Math.round((hours.reduce((s, v) => s + v, 0) / hours.length) * 10) / 10
      : null;
    if (!DRY) await prisma.user.update({ where: { id: userId }, data: { responseTimeHours: average } });
    updated += 1;
  }
  console.log(`${DRY ? "[dry] " : ""}hosts: ${updated} response times`);
}

Promise.resolve()
  .then(backfillListingRatings)
  .then(backfillHostResponseTimes)
  .then(() => console.log("\nDone."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
