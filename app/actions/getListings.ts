import prisma from "@/app/libs/prismadb";

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

export default async function getListings(params: IListingsParams) {
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
      orderBy: { createdAt: "desc" },
    });

    // Fetch associated badges
    const badgeKeys = listings.map((listing) => listing.badge).filter(Boolean);
    const badges = await prisma.badge.findMany({
      where: { key: { in: badgeKeys } },
    });

    const badgeMap = Object.fromEntries(badges.map((b) => [b.key, b.value]));

    return listings.map((listing) => ({
      ...listing,
      address: "",
      latitude: null,
      longitude: null,
      regoNumber: null,
      regoEndDate: null,
      regoImage: "",
      badgeValue: badgeMap[listing.badge] || null,
      createdAt: listing.createdAt.toISOString(),
    }));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}
