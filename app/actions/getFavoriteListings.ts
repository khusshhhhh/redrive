import prisma from "../libs/prismadb";

import getCurrentUser from "./getCurrentUser";

export default async function getFavoriteListings() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return [];
    }

    const favorites = await prisma.listing.findMany({
      where: {
        id: {
          in: [...(currentUser.favoriteIds || [])],
        },
      },
    });

    const safeFavorites = favorites.map((favorite) => ({
      ...favorite,
      createdAt: favorite.createdAt.toISOString(),
    }));

    // User.favoriteIds is append-only when a vehicle is saved. Reconstruct the
    // requested order so the most recently saved vehicle appears first rather
    // than relying on MongoDB's unspecified `in` query order.
    const favoritesById = new Map(safeFavorites.map((favorite) => [favorite.id, favorite]));
    return [...(currentUser.favoriteIds || [])]
      .reverse()
      .map((id) => favoritesById.get(id))
      .filter((favorite): favorite is (typeof safeFavorites)[number] => Boolean(favorite));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new Error(error);
  }
}
