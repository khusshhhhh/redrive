import { unstable_cache } from "next/cache";

import prisma from "@/app/libs/prismadb";
import type { ListingCardData } from "@/app/libs/listingCardData";
import { AU_STATE_LIST, CATEGORY_LABELS } from "@/app/libs/marketplace";

export const HOME_DATA_CACHE_TAG = "home-data";

export interface HomeStats {
  liveCount: number;
  stateCount: number;
  categoryCount: number;
  suburbCount: number;
  medianResponseHours: number | null;
  verifiedSharePct: number;
  instantSharePct: number;
}

export interface HomeCategory {
  label: string;
  count: number;
  fromPrice: number | null;
}

export interface HomeStateCoverage {
  state: string;
  label: string;
  count: number;
}

export interface HomeReview {
  id: string;
  rating: number;
  text: string;
  vehicle: string;
  suburb: string;
  state: string;
}

export interface HomeData {
  stats: HomeStats;
  byCategory: HomeCategory[];
  byState: HomeStateCoverage[];
  cards: ListingCardData[];
  fresh: ListingCardData[];
  reviews: HomeReview[];
}

const EMPTY: HomeData = {
  stats: {
    liveCount: 0,
    stateCount: 0,
    categoryCount: 0,
    suburbCount: 0,
    medianResponseHours: null,
    verifiedSharePct: 0,
    instantSharePct: 0,
  },
  byCategory: CATEGORY_LABELS.map((label) => ({ label, count: 0, fromPrice: null })),
  byState: AU_STATE_LIST.map((state) => ({ state: state.value, label: state.label, count: 0 })),
  cards: [],
  fresh: [],
  reviews: [],
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function loadHomeData(): Promise<HomeData> {
  const [listings, reviewRows] = await Promise.all([
    prisma.listing.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        suburb: true,
        state: true,
        price: true,
        imageSrcs: true,
        badge: true,
        instantBook: true,
        createdAt: true,
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
    }),
    // Every Review row is gated on a COMPLETED reservation that ended 1+ day
    // ago (see app/api/reviews/route.ts), so these are genuine trip reviews.
    // Only ones past the two-way blind-reveal (or pre-dating it) are shown.
    // GuestVoices discloses that this is a recent selection.
    prisma.review.findMany({
      where: {
        rating: { gte: 4 },
        OR: [
          { publishedAt: { not: null } },
          { reservationId: null },
          { reservationId: { isSet: false } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 16,
      select: {
        id: true,
        rating: true,
        text: true,
        listing: { select: { title: true, suburb: true, state: true } },
      },
    }),
  ]);

  if (listings.length === 0) return EMPTY;

  const badgeKeys = listings.map((listing) => listing.badge).filter(Boolean) as string[];
  const badges = badgeKeys.length
    ? await prisma.badge.findMany({ where: { key: { in: badgeKeys } } })
    : [];
  const badgeMap = Object.fromEntries(badges.map((badge) => [badge.key, badge.value]));

  const responseHoursPerListing: number[] = [];
  let verifiedCount = 0;
  let instantCount = 0;

  const cards: ListingCardData[] = listings.map((listing) => {
    const reviewCount = listing.reviews.length;
    const reviewAverage = reviewCount
      ? Math.round((listing.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;

    const hours = listing.reservations
      .map((reservation) =>
        reservation.respondedAt
          ? Math.max(0, (reservation.respondedAt.getTime() - reservation.createdAt.getTime()) / 3_600_000)
          : null,
      )
      .filter((value): value is number => value !== null);
    const listingResponseHours = hours.length
      ? Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10
      : null;
    if (listingResponseHours !== null) responseHoursPerListing.push(listingResponseHours);

    const verified = listing.user?.profileVerified === "Y";
    if (verified) verifiedCount += 1;
    if (listing.instantBook) instantCount += 1;

    return {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      suburb: listing.suburb,
      state: listing.state,
      price: listing.price,
      imageSrcs: listing.imageSrcs?.length ? [listing.imageSrcs[0]] : [],
      badgeValue: (listing.badge && badgeMap[listing.badge]) || null,
      reviewAverage,
      reviewCount,
      hostVerified: verified,
      hostResponseHours: listingResponseHours,
      instantBook: listing.instantBook,
    };
  });

  const statesPresent = new Set(listings.map((listing) => listing.state).filter(Boolean));
  const categoriesPresent = new Set(listings.map((listing) => listing.category).filter(Boolean));
  const suburbsPresent = new Set(listings.map((listing) => listing.suburb?.toLowerCase()).filter(Boolean));

  const byCategory: HomeCategory[] = CATEGORY_LABELS.map((label) => {
    const inCategory = listings.filter((listing) => listing.category === label);
    return {
      label,
      count: inCategory.length,
      fromPrice: inCategory.length ? Math.min(...inCategory.map((listing) => listing.price)) : null,
    };
  });

  const byState: HomeStateCoverage[] = AU_STATE_LIST.map((state) => ({
    state: state.value,
    label: state.label,
    count: listings.filter((listing) => listing.state === state.value).length,
  })).sort((a, b) => b.count - a.count);

  const fresh = [...cards]
    .sort(
      (a, b) =>
        (listings.find((l) => l.id === b.id)?.createdAt.getTime() ?? 0) -
        (listings.find((l) => l.id === a.id)?.createdAt.getTime() ?? 0),
    )
    .slice(0, 12);

  const reviews: HomeReview[] = reviewRows
    .filter((row) => row.text && row.text.trim().length >= 40 && row.listing)
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      rating: row.rating,
      text: row.text.trim(),
      vehicle: row.listing!.title,
      suburb: row.listing!.suburb,
      state: row.listing!.state,
    }));

  return {
    stats: {
      liveCount: listings.length,
      stateCount: statesPresent.size,
      categoryCount: categoriesPresent.size,
      suburbCount: suburbsPresent.size,
      medianResponseHours: median(responseHoursPerListing),
      verifiedSharePct: Math.round((verifiedCount / listings.length) * 100),
      instantSharePct: Math.round((instantCount / listings.length) * 100),
    },
    byCategory,
    byState,
    cards,
    fresh,
    reviews,
  };
}

const cachedHomeData = unstable_cache(loadHomeData, ["home-data-v1"], {
  revalidate: 600,
  tags: [HOME_DATA_CACHE_TAG],
});

export default async function getHomeData(): Promise<HomeData> {
  try {
    return await cachedHomeData();
  } catch {
    return EMPTY;
  }
}
