import { Prisma } from "@prisma/client";
import prisma from "@/app/libs/prismadb";

// Serialises the "check availability → create reservation" section for a single
// listing. Prisma/Mongo gives no row locks, so without this two concurrent
// requests for overlapping dates can both pass the conflict check and both
// insert. Bookings for any one listing are rare enough that a per-listing lock
// costs nothing in practice.

const LOCK_TTL_MS = 15_000;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Run `fn` while holding an exclusive lock on `listingId`. Throws
 * `BookingLockedError` if another booking for the same listing is in flight.
 */
export async function withListingBookingLock<T>(
  listingId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const expiresAt = new Date(now + LOCK_TTL_MS);

  // Clear a stale lock left by a crashed request, then take the lock.
  await prisma.bookingLock.deleteMany({
    where: { listingId, expiresAt: { lt: new Date(now) } },
  });

  try {
    await prisma.bookingLock.create({ data: { listingId, expiresAt } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new BookingLockedError(listingId);
    throw error;
  }

  try {
    return await fn();
  } finally {
    await prisma.bookingLock
      .deleteMany({ where: { listingId } })
      .catch((error) => console.error("Failed to release booking lock", listingId, error));
  }
}

export class BookingLockedError extends Error {
  constructor(listingId: string) {
    super(`Another booking for listing ${listingId} is in progress`);
    this.name = "BookingLockedError";
  }
}

/**
 * Throw from inside `withListingBookingLock` when the in-lock conflict re-check
 * finds the dates are taken, so the caller returns a clean 409.
 */
export class DatesUnavailableError extends Error {
  constructor() {
    super("Those dates are no longer available");
    this.name = "DatesUnavailableError";
  }
}
