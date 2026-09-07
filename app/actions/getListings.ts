import prisma from "@/app/libs/prismadb";
import { revalidateTag, unstable_cache } from "next/cache";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";
import { parseBounds, scanListingArea } from "@/app/libs/suburbGeoData";

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
  transmission?: string;
  delivery?: string | boolean;
  petsAllowed?: string | boolean;
  unsealed?: string | boolean;
  /** Cursor pagination: id of the last listing from the previous page. */
  cursor?: string;
  /** Rows to return (clamped 1..MAX_LISTINGS_PAGE). */
  limit?: number;
  /** Map viewport for the /explore "search this area" flow. When all four are
   *  present and valid they supersede `state` / `suburb`: results are filtered
   *  to the suburbs (or, when zoomed far out, the states) inside the box. */
  swLat?: number | string;
  swLng?: number | string;
  neLat?: number | string;
  neLng?: number | string;
}

/** Default rows per discovery page, and the hard ceiling per request. */
export const LISTINGS_PAGE_SIZE = 24;
export const MAX_LISTINGS_PAGE = 48;
const OWNER_LISTINGS_CAP = 200;

const isTruthyParam = (value: unknown) =>
  value === true || value === "true" || value === "1" || value === "on";

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
  if (params?.userId) {
    return getListingsFromDatabase({ ...params, limit: params.limit ?? OWNER_LISTINGS_CAP });
  }
  const publicParams = {
    ...(params || {}),
    limit: clampLimit(params?.limit ?? MAX_LISTINGS_PAGE),
  };
  const memoryKey = publicListingsMemoryKey(publicParams);
  const memoryHit = publicListingsMemoryCache.get(memoryKey);
  if (memoryHit !== undefined) return memoryHit;

  const listings = await getCachedPublicListings(publicParams);
  publicListingsMemoryCache.set(memoryKey, listings);
  return listings;
}

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return LISTINGS_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(value)), MAX_LISTINGS_PAGE);
}

/**
 * One page of public discovery results plus the cursor for the next page.
 * Fetches one extra row to know whether a next page exists without a count.
 */
export async function getListingsPage(
  params: IListingsParams,
): Promise<{ listings: PublicListings; nextCursor: string | null }> {
  const limit = clampLimit(params.limit ?? LISTINGS_PAGE_SIZE);
  const probe = await getListings({ ...params, limit: limit + 1 });
  const hasMore = probe.length > limit;
  const listings = hasMore ? probe.slice(0, limit) : probe;
  return {
    listings,
    nextCursor: hasMore ? listings[listings.length - 1]?.id ?? null : null,
  };
}

export function invalidatePublicListingsCache() {
  publicListingsMemoryCache.clear();
  revalidateTag(PUBLIC_LISTINGS_CACHE_TAG);
  revalidateTag("home-data");
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
      transmission,
      delivery,
      petsAllowed,
      unsealed,
      cursor,
      limit,
      swLat,
      swLng,
      neLat,
      neLng,
    } = params || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const and: any[] = [];

    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (guestCount) query.guestCount = { gte: +guestCount };
    if (sleepCount) query.sleepCount = { gte: +sleepCount };

    if (transmission) and.push({ transmission });
    if (isTruthyParam(delivery)) and.push({ OR: [{ deliveryAvailable: true }, { airportPickup: true }] });
    if (isTruthyParam(petsAllowed)) and.push({ petsAllowed: true });
    if (isTruthyParam(unsealed)) and.push({ OR: [{ unsealedRoadsAllowed: true }, { offRoadAllowed: true }] });
    if (and.length) query.AND = and;

    if (state && state !== "Anywhere") {
      query.state = state;
    }

    if (suburb) {
      query.suburb = { equals: suburb, mode: "insensitive" };
    }

    // Map viewport ("search this area"). When valid, it replaces the single
    // state / suburb filters with the set the box covers. Listings are stored
    // with the canonical suburb name from the same dataset, so an exact `in`
    // match is correct; a far-out viewport falls back to whole states.
    const bounds = parseBounds({ swLat, swLng, neLat, neLng });
    if (bounds) {
      const area = scanListingArea(bounds);
      if (area.states.length === 0) {
        // Nothing on land inside the viewport.
        return [];
      }
      delete query.state;
      delete query.suburb;
      if (area.capped || area.suburbNames.length === 0) {
        query.state = { in: area.states };
      } else {
        query.state = { in: area.states };
        query.suburb = { in: area.suburbNames };
      }
    }

    if (information)
      query.information = { contains: information, mode: "insensitive" };

    const parsedMinPrice = minPrice ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? Number(maxPrice) : undefined;

    if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
      query.price = {};
      if (parsedMinPrice !== undefined) query.price.gte = parsedMinPrice;
      if (parsedMaxPrice !== undefined) query.price.lte = parsedMaxPrice;
    }

    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())) {
        // A booking blocks the search window whenever the two ranges touch at
        // all: it starts on/before the window ends AND ends on/after the window
        // starts. The previous predicate only caught bookings overlapping an
        // endpoint, so a booking sitting entirely inside the window slipped
        // through and the vehicle showed as available. This mirrors the overlap
        // check the reservation-create route runs before committing.
        const negations: Record<string, unknown>[] = [
          {
            reservations: {
              some: {
                status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] },
                startDate: { lte: rangeEnd },
                endDate: { gte: rangeStart },
              },
            },
          },
        ];

        // AvailabilityBlock has no Prisma relation back to Listing, so the
        // host-blocked / iCal-synced dates are resolved separately and the
        // affected listings are excluded by id.
        const blocks = await prisma.availabilityBlock.findMany({
          where: { startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
          select: { listingId: true },
        });
        const blockedListingIds = [...new Set(blocks.map((block) => block.listingId))];
        if (blockedListingIds.length) {
          negations.push({ id: { in: blockedListingIds } });
        }

        query.NOT = negations;
      }
    }

    const take = Number.isFinite(limit as number)
      ? Math.min(Math.max(1, Math.floor(limit as number)), OWNER_LISTINGS_CAP)
      : MAX_LISTINGS_PAGE;

    const listings = await prisma.listing.findMany({
      where: query,
      include: {
        // Review average / count and host response time are denormalised
        // (Listing.reviewAverage/reviewCount, User.responseTimeHours), kept
        // fresh on write — see libs/listingStats.ts. No per-row review or
        // reservation scan on every search.
        user: { select: { profileVerified: true, responseTimeHours: true } },
      },
      // Compound order so id (unique) breaks createdAt ties — required for
      // stable cursor pagination.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const badgeKeys = listings.map((listing) => listing.badge).filter(Boolean);
    const badges = await prisma.badge.findMany({
      where: { key: { in: badgeKeys } },
    });

    const badgeMap = Object.fromEntries(badges.map((b) => [b.key, b.value]));

    return listings.map((listing) => {
      const { user, ...publicListing } = listing;
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
      lastServicedAt: listing.lastServicedAt ? listing.lastServicedAt.toISOString() : null,
      reviewAverage: listing.reviewAverage ?? 0,
      reviewCount: listing.reviewCount ?? 0,
      hostVerified: user.profileVerified === "Y",
      hostResponseHours: user.responseTimeHours,
    };
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}
