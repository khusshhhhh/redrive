import prisma from "@/app/libs/prismadb";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  sleepCount?: number;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const {
      userId,
      guestCount,
      sleepCount,
      startDate,
      endDate,
      locationValue,
      category,
    } = params || {};

    const query: {
      userId?: string;
      guestCount?: { gte: number };
      sleepCount?: { gte: number };
      startDate?: string;
      endDate?: string;
      locationValue?: string;
      category?: string;
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
    if (locationValue) query.locationValue = locationValue;

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

    return listings.map((listing) => ({
      ...listing,
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
