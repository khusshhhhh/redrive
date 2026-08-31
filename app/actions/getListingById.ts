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

  return {
    ...listing,
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
