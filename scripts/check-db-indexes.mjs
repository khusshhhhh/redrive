#!/usr/bin/env node
// Asserts the indexes that Redrive's correctness depends on actually exist in
// the database `DATABASE_URL` points at.
//
//   node scripts/check-db-indexes.mjs
//
// `prisma db push` DOES create @unique / @@unique / @@index, but a partial push,
// a stale environment, or a hand-edited collection can leave them missing —
// which turns advisory locks, idempotency keys and dedupe guards into silent
// no-ops. Run this after every `prisma db push` and in the deploy pipeline.
//
// Exit 1 if any CRITICAL (unique / correctness) index is missing. Missing
// performance indexes are warnings only.

import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("check-db-indexes: DATABASE_URL is not set.");
  process.exit(1);
}

// [collection, keyPattern, { unique?, critical? }]
// Derived from prisma/schema.prisma @unique / @@unique / @@index. Prisma maps a
// model to a same-named collection (no @@map in this schema).
const REQUIRED = [
  // ── Concurrency / dedupe / idempotency — correctness-critical ────────────
  ["BookingLock", { listingId: 1 }, { unique: true, critical: true }],
  ["IdempotencyRecord", { fingerprint: 1 }, { unique: true, critical: true }],
  ["StripeWebhookEvent", { stripeEventId: 1 }, { unique: true, critical: true }],
  ["CronRun", { name: 1 }, { unique: true, critical: true }],
  ["NotificationDelivery", { dedupeKey: 1 }, { unique: true, critical: true }],
  // ── Payments ───────────────────────────────────────────────────────────
  ["Payment", { reservationId: 1 }, { unique: true, critical: true }],
  ["Payment", { stripeCheckoutSessionId: 1 }, { unique: true, critical: true }],
  ["Payment", { stripePaymentIntentId: 1 }, { unique: true, critical: true }],
  ["Payment", { stripeTransferId: 1 }, { unique: true, critical: true }],
  // ── Sessions / auth ────────────────────────────────────────────────────
  ["UserSession", { tokenHash: 1 }, { unique: true, critical: true }],
  ["MobileSession", { refreshTokenHash: 1 }, { unique: true, critical: true }],
  ["PasswordResetToken", { tokenHash: 1 }, { unique: true, critical: true }],
  ["Account", { provider: 1, providerAccountId: 1 }, { unique: true, critical: true }],
  ["User", { email: 1 }, { unique: true, critical: true }],
  // ── One-per-relationship guards ────────────────────────────────────────
  ["Favourite", { userId: 1, listingId: 1 }, { unique: true, critical: true }],
  ["Review", { userId: 1, listingId: 1 }, { unique: true, critical: true }],
  ["GuestReview", { reservationId: 1 }, { unique: true, critical: true }],
  ["HandoverReport", { reservationId: 1, phase: 1 }, { unique: true, critical: true }],
  ["ReservationDriver", { reservationId: 1, role: 1 }, { unique: true, critical: true }],
  // ── Hot query paths — performance, not correctness ─────────────────────
  ["Listing", { state: 1, suburb: 1, category: 1, price: 1 }, {}],
  ["Reservation", { listingId: 1, status: 1, startDate: 1, endDate: 1 }, {}],
  ["Reservation", { status: 1, paymentDueAt: 1 }, {}],
  ["Reservation", { status: 1, autoReleaseAt: 1 }, {}],
  ["AvailabilityBlock", { listingId: 1, startDate: 1, endDate: 1 }, {}],
  ["Notification", { userId: 1 }, {}],
];

const sameKey = (a, b) => {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k, i) => k === bk[i] && a[k] === b[k]);
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const db = client.db();
  const collections = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const missingCritical = [];
  const missingPerf = [];

  for (const [collection, keyPattern, opts] of REQUIRED) {
    if (!collections.has(collection)) {
      // No collection yet just means no rows have been written — Mongo creates
      // it (and its indexes, once pushed) on first insert. Not a failure.
      continue;
    }
    const indexes = await db.collection(collection).indexes();
    const match = indexes.find((ix) => sameKey(ix.key, keyPattern));
    const label = `${collection} { ${Object.entries(keyPattern).map(([k, v]) => `${k}:${v}`).join(", ")} }`;

    if (!match) {
      (opts.critical ? missingCritical : missingPerf).push(label);
      continue;
    }
    if (opts.unique && !match.unique) {
      missingCritical.push(`${label} — exists but is NOT unique`);
    }
  }

  if (missingPerf.length) {
    console.warn("check-db-indexes: missing performance indexes (run `prisma db push`):");
    for (const l of missingPerf) console.warn(`  · ${l}`);
    console.warn("");
  }

  if (missingCritical.length) {
    console.error("check-db-indexes: MISSING correctness-critical indexes:");
    for (const l of missingCritical) console.error(`  ✗ ${l}`);
    console.error("\nRun `npx prisma db push` against this database, then re-check.");
    process.exitCode = 1;
  } else {
    console.log("check-db-indexes: OK — all correctness-critical indexes present.");
  }
} catch (error) {
  console.error("check-db-indexes: could not verify —", error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
