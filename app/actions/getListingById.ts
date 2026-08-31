import { cache } from "react";
import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
}

// Memoised for the lifetime of a single request so the listing page and its
// `generateMetadata` share one database read instead of querying twice. Keyed on
// the id string (not the params object) so both call sites hit the same entry.
const fetchListingById = cache(async (listingId: string) => {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      reviews: { where: { OR: [{ publishedAt: { not: null } }, { reservationId: null }, { reservationId: { isSet: false } }] }, select: { rating: true } },
      reservations: {
        where: { respondedAt: { not: null } },
        select: { createdAt: true, respondedAt: true },
        orderBy: { respondedAt: "desc" },
        take: 20,
      },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          profileVerified: true,
          suburb: true,
          state: true,
          createdAt: true,
          listings: { select: { createdAt: true } },
        },
      },
    },
  });

  if (!listing) {
    return null;
  }

  const reviewCount = listing.reviews.length;
  const reviewAverage = reviewCount
    ? Math.round((listing.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const responseSamples = listing.reservations
    .map((reservation) =>
      reservation.respondedAt
        ? Math.max(0, (reservation.respondedAt.getTime() - reservation.createdAt.getTime()) / 3_600_000)
        : null,
    )
    .filter((value): value is number => value !== null);
  const hostResponseHours = responseSamples.length
    ? Math.round((responseSamples.reduce((sum, value) => sum + value, 0) / responseSamples.length) * 10) / 10
    : null;

  return {
    ...listing,
    reviews: undefined,
    reservations: undefined,
    reviewAverage,
    reviewCount,
    hostVerified: listing.user.profileVerified === "Y",
    hostResponseHours,
    address: `${listing.suburb}, ${listing.state}`,
    latitude: null,
    longitude: null,
    regoNumber: null,
    regoEndDate: null,
    regoImage: "",
    createdAt: listing.createdAt.toISOString(),
    lastServicedAt: listing.lastServicedAt ? listing.lastServicedAt.toISOString() : null,
    user: {
      ...listing.user,
      createdAt: listing.user.createdAt.toISOString(),
      listings: listing.user.listings.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    },
  };
});

export default async function getListingById(paramsPromise: IParams) {
  try {
    const params = await paramsPromise;
    const { listingId } = params;

    if (!listingId) {
      return null;
    }

    return await fetchListingById(listingId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new Error(error);
  }
}
