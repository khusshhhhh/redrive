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
      user: {
        ...listing.user,
        createdAt: listing.user.createdAt.toISOString(),
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
