import prisma from "@/app/libs/prismadb";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  sleepCount?: number;
  startDate?: string;
  endDate?: string;
  state?: string; // ✅ Replaced locationValue with state
  category?: string;
  information?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const {
      userId,
      guestCount,
      sleepCount,
      startDate,
      endDate,
      state, // ✅ Updated to filter by state instead of locationValue
      category,
      information,
    } = params || {};

    const query: {
      userId?: string;
      guestCount?: { gte: number };
      sleepCount?: { gte: number };
      startDate?: string;
      endDate?: string;
      state?: string; // ✅ Added state filter
      category?: string;
      information?: { contains: string; mode: "insensitive" };
      NOT?: {
        reservations: {
          some: {
            OR: Array<{
              endDate: { gte: string };
              startDate: { lte: string };
            }>;
          };
        };
      };
    } = {};

    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (guestCount) query.guestCount = { gte: +guestCount };
    if (sleepCount) query.sleepCount = { gte: +sleepCount };
    if (state) query.state = state; // ✅ Search by state
    if (information)
      query.information = { contains: information, mode: "insensitive" };

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

    // ✅ Fetch badges dynamically
    const badgeKeys = listings.map((listing) => listing.badge).filter(Boolean);
    const badges = await prisma.badge.findMany({
      where: { key: { in: badgeKeys } },
    });

    const badgeMap = Object.fromEntries(badges.map((b) => [b.key, b.value]));

    return listings.map((listing) => ({
      ...listing,
      badgeValue: badgeMap[listing.badge] || null,
      createdAt: listing.createdAt.toISOString(),
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}
