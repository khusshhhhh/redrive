import prisma from "../libs/prismadb";
import { apiErrorMessage } from "../libs/errorMessage";

import getCurrentUser from "./getCurrentUser";

export default async function getFavoriteListings() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    // Read from the Favourite join rows — ordered by when each was saved,
    // newest first, no array-reversal guesswork. Falls back to the legacy
    // `favoriteIds` array for accounts saved before the join table existed.
    const favouriteRows = await prisma.favourite.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
      select: { listingId: true },
    });

    const orderedIds = favouriteRows.length
      ? favouriteRows.map((row) => row.listingId)
      : [...(currentUser.favoriteIds || [])].reverse();

    if (orderedIds.length === 0) return [];

    const listings = await prisma.listing.findMany({ where: { id: { in: orderedIds } } });
    const byId = new Map(
      listings.map((listing) => [
        listing.id,
        {
          ...listing,
          createdAt: listing.createdAt.toISOString(),
          lastServicedAt: listing.lastServicedAt ? listing.lastServicedAt.toISOString() : null,
        },
      ]),
    );

    return orderedIds
      .map((id) => byId.get(id))
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing));
  } catch (error) {
    throw new Error(apiErrorMessage(error, "Failed to load favourites"));
  }
}
