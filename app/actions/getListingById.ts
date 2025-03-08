import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
}

export default async function getListingById(paramsPromise: IParams) {
  try {
    const params = await paramsPromise;
    const { listingId } = params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: {
          include: { listings: true }, // Include the user's listings
        },
      },
    });

    if (!listing) {
      return null;
    }

    return {
      ...listing,
      createdAt: listing.createdAt.toISOString(),
      user: {
        ...listing.user,
        createdAt: listing.user.createdAt.toISOString(),
        updatedAt: listing.user.updatedAt.toISOString(),
        emailVerified: listing.user.emailVerified?.toISOString() || null,
        listings: listing.user.listings.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new Error(error);
  }
}
