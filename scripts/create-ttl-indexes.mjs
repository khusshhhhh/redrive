#!/usr/bin/env node
/**
 * Convert the plain `expiresAt` indexes on the short-lived collections into
 * MongoDB TTL indexes, so the database auto-expires the rows instead of relying
 * on the nightly security-maintenance sweep.
 *
 *   node scripts/create-ttl-indexes.mjs
 *
 * Idempotent — safe to re-run. Reads DATABASE_URL from the environment.
 * Run once after `prisma db push` and again if this list changes. Prisma's
 * schema can't express `expireAfterSeconds`, so `prisma db push` leaves these
 * alone (it only checks the key pattern, which is unchanged).
 *
 * Collections with a deliberate retention window past expiry
 * (LicenceCheck, PasswordResetToken, *Session, MobileAuthChallenge) are NOT
 * TTL'd here — the cron keeps handling those.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// collection -> seconds to keep a document past its `expiresAt`
const TTL_COLLECTIONS = {
  RateLimitBucket: 0,
  BookingQuote: 0,
  ApiMetricBucket: 0,
  ApiErrorEvent: 0,
  IdempotencyRecord: 0,
  BookingLock: 0,
};

async function existingExpiresAtIndex(collection) {
  try {
    const result = await prisma.$runCommandRaw({ listIndexes: collection });
    const indexes = result?.cursor?.firstBatch ?? [];
    return indexes.find(
      (index) =>
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.expiresAt === 1,
    );
  } catch {
    return null; // collection doesn't exist yet — nothing to do
  }
}

async function run() {
  for (const [collection, expireAfterSeconds] of Object.entries(TTL_COLLECTIONS)) {
    const index = await existingExpiresAtIndex(collection);

    if (!index) {
      console.log(`· ${collection}: no expiresAt index / collection — skipping`);
      continue;
    }

    if (typeof index.expireAfterSeconds === "number") {
      if (index.expireAfterSeconds === expireAfterSeconds) {
        console.log(`✓ ${collection}: already TTL (${expireAfterSeconds}s)`);
        continue;
      }
      // Adjust the window in place.
      await prisma.$runCommandRaw({
        collMod: collection,
        index: { keyPattern: { expiresAt: 1 }, expireAfterSeconds },
      });
      console.log(`↻ ${collection}: TTL adjusted to ${expireAfterSeconds}s`);
      continue;
    }

    // Plain index → make it a TTL index without dropping it.
    await prisma.$runCommandRaw({
      collMod: collection,
      index: { keyPattern: { expiresAt: 1 }, expireAfterSeconds },
    });
    console.log(`+ ${collection}: converted expiresAt index to TTL (${expireAfterSeconds}s)`);
  }
}

run()
  .then(() => console.log("\nDone."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
