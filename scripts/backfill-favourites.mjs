#!/usr/bin/env node
/**
 * Backfill `Favourite` join rows from the legacy `User.favoriteIds` arrays.
 *
 *   node scripts/backfill-favourites.mjs [--dry]
 *
 * Idempotent — uses upsert, so re-running is safe. Existing rows keep their
 * original `createdAt`. Ordering can't be recovered from the array (it has no
 * timestamps), so backfilled rows all get "now" and `getFavoriteListings`
 * shows array order for those until the user re-saves.
 *
 * Run once after `prisma db push` adds the Favourite collection.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

async function run() {
  const users = await prisma.user.findMany({
    where: { favoriteIds: { isEmpty: false } },
    select: { id: true, favoriteIds: true },
  });

  let created = 0;
  let scanned = 0;
  for (const user of users) {
    for (const listingId of user.favoriteIds) {
      scanned += 1;
      if (DRY) continue;
      const result = await prisma.favourite.upsert({
        where: { userId_listingId: { userId: user.id, listingId } },
        create: { userId: user.id, listingId },
        update: {},
      });
      if (result) created += 1;
    }
  }

  console.log(
    `${DRY ? "[dry] " : ""}${users.length} users, ${scanned} favourite entries, ${created} rows upserted.`,
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
