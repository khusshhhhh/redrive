import prisma from "@/app/libs/prismadb";
import { revalidateTag, unstable_cache } from "next/cache";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";

const PUBLIC_LISTINGS_CACHE_TAG = "public-listings";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  sleepCount?: number;
  startDate?: string;
  endDate?: string;
  state?: string;
  suburb?: string;
  category?: string;
  information?: string;
  minPrice?: number | string; // Ensure this accepts both number & string
  maxPrice?: number | string;
}

const getCachedPublicListings = unstable_cache(
  async (params: IListingsParams) => getListingsFromDatabase(params),
  ["public-listings-v1"],
  { revalidate: 15, tags: [PUBLIC_LISTINGS_CACHE_TAG] },
);

type PublicListings = Awaited<ReturnType<typeof getListingsFromDatabase>>;

// Five seconds is long enough to collapse repeated hot requests inside one
// warm function instance while keeping availability changes tightly bounded.
// The shared Next data cache below remains useful across instances.
const publicListingsMemoryCache = new BoundedMemoryCache<PublicListings>({
  maxEntries: 50,
  ttlMs: 5_000,
});

function publicListingsMemoryKey(params: IListingsParams) {
  const normalized = Object.fromEntries(
    Object.entries(params || {})
      .filter(([, value]) => value !== undefined && value !== "")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  return JSON.stringify(normalized);
}

export default async function getListings(params: IListingsParams) {
  // Owner-management pages must always see their latest records. Public
  // discovery can tolerate at most 15 seconds of staleness; booking writes
  // still revalidate availability against MongoDB before committing.
  if (params?.userId) return getListingsFromDatabase(params);
  const publicParams = params || {};
  const memoryKey = publicListingsMemoryKey(publicParams);
  const memoryHit = publicListingsMemoryCache.get(memoryKey);
  if (memoryHit !== undefined) return memoryHit;

  const listings = await getCachedPublicListings(publicParams);
  publicListingsMemoryCache.set(memoryKey, listings);
  return listings;
}

export function invalidatePublicListingsCache() {
  publicListingsMemoryCache.clear();
  revalidateTag(PUBLIC_LISTINGS_CACHE_TAG);
}

async function getListingsFromDatabase(params: IListingsParams) {
  try {
    const {
      userId,
      guestCount,
      sleepCount,
      startDate,
      endDate,
      state,
      suburb,
      category,
      information,
      minPrice,
      maxPrice,
    } = params || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (guestCount) query.guestCount = { gte: +guestCount };
    if (sleepCount) query.sleepCount = { gte: +sleepCount };

    // Only filter by state if one is provided and it's not "Anywhere"
    if (state && state !== "Anywhere") {
      query.state = state;
    }

    if (suburb) {
      query.suburb = { equals: suburb, mode: "insensitive" };
    }

    if (information)
      query.information = { contains: information, mode: "insensitive" };

    // Convert minPrice & maxPrice to numbers before filtering
    const parsedMinPrice = minPrice ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? Number(maxPrice) : undefined;

    if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
      query.price = {};
      if (parsedMinPrice !== undefined) query.price.gte = parsedMinPrice;
      if (parsedMaxPrice !== undefined) query.price.lte = parsedMaxPrice;
    }

    if (startDate && endDate) {
      query.NOT = {
        reservations: {
          some: {
            status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] },
            OR: [
              { endDate: { gte: startDate }, startDate: { lte: startDate } },
              { startDate: { lte: endDate }, endDate: { gte: endDate } },
            ],
          },
        },
      };
    }

    const listings = await prisma.listing.findMany({
      where: query,
      include: {
        user: { select: { profileVerified: true } },
        reviews: { select: { rating: true } },
        reservations: {
          where: { respondedAt: { not: null } },
          select: { createdAt: true, respondedAt: true },
          orderBy: { respondedAt: "desc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch associated badges
    const badgeKeys = listings.map((listing) => listing.badge).filter(Boolean);
    const badges = await prisma.badge.findMany({
      where: { key: { in: badgeKeys } },
    });

    const badgeMap = Object.fromEntries(badges.map((b) => [b.key, b.value]));

    return listings.map((listing) => {
      const { reviews, reservations, user, ...publicListing } = listing;
      const reviewAverage = reviews.length
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;
      const responseHours = reservations
        .map((reservation) => reservation.respondedAt
          ? Math.max(0, (reservation.respondedAt.getTime() - reservation.createdAt.getTime()) / 3_600_000)
          : null)
        .filter((hours): hours is number => hours !== null);

      return {
      ...publicListing,
      address: "",
      latitude: null,
      longitude: null,
      regoNumber: null,
      regoEndDate: null,
      regoImage: "",
      badgeValue: badgeMap[listing.badge] || null,
      createdAt: listing.createdAt.toISOString(),
      reviewAverage: Math.round(reviewAverage * 10) / 10,
      reviewCount: reviews.length,
      hostVerified: user.profileVerified === "Y",
      hostResponseHours: responseHours.length
        ? Math.round((responseHours.reduce((sum, hours) => sum + hours, 0) / responseHours.length) * 10) / 10
        : null,
    };
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}
