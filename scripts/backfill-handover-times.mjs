#!/usr/bin/env node
/**
 * One-off backfill for the handover-times feature.
 *
 *   node scripts/backfill-handover-times.mjs [--dry]
 *
 * 1. Sets `Listing.timezone` from the listing's state where it's missing.
 * 2. Sets a confirmed `pickupTime` on every live reservation (REVIEWING /
 *    APPROVED / ACTIVE) that doesn't have one, using the listing's pickup
 *    window opening time or the platform default (06:00).
 *
 * Idempotent — safe to re-run. Reads DATABASE_URL from the environment.
 * Kept dependency-free (no TS imports) so it runs under plain node.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const STATE_TIMEZONE = {
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
  WA: "Australia/Perth",
  TAS: "Australia/Hobart",
};
const DEFAULT_TIMEZONE = "Australia/Sydney";
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timezoneForState = (state) =>
  (state && STATE_TIMEZONE[String(state).trim().toUpperCase()]) || DEFAULT_TIMEZONE;

const resolvePickupTime = (windowStart) =>
  typeof windowStart === "string" && TIME_OF_DAY.test(windowStart) ? windowStart : "06:00";

async function backfillListingTimezones() {
  const listings = await prisma.listing.findMany({
    where: { OR: [{ timezone: null }, { timezone: "" }] },
    select: { id: true, state: true },
  });
  for (const listing of listings) {
    const timezone = timezoneForState(listing.state);
    console.log(`listing ${listing.id}: ${listing.state || "?"} -> ${timezone}`);
    if (!DRY) await prisma.listing.update({ where: { id: listing.id }, data: { timezone } });
  }
  console.log(`\nListing timezones: ${listings.length} ${DRY ? "would be " : ""}updated\n`);
}

async function backfillReservationPickupTimes() {
  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] },
      OR: [{ pickupTime: null }, { pickupTime: "" }],
    },
    select: { id: true, listing: { select: { pickupWindowStart: true } } },
  });
  for (const reservation of reservations) {
    const pickupTime = resolvePickupTime(reservation.listing.pickupWindowStart);
    console.log(`reservation ${reservation.id}: pickupTime -> ${pickupTime}`);
    if (!DRY) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          pickupTime,
          pickupTimeSetByRole: "GUEST",
          pickupTimeConfirmed: true,
          pickupTimeUpdatedAt: new Date(),
        },
      });
    }
  }
  console.log(`\nReservation pickup times: ${reservations.length} ${DRY ? "would be " : ""}updated\n`);
}

async function main() {
  if (DRY) console.log("DRY RUN — no writes\n");
  await backfillListingTimezones();
  await backfillReservationPickupTimes();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
