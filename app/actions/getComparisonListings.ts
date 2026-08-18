import prisma from "@/app/libs/prismadb";

export interface ComparisonVehicle {
  id: string; title: string; imageSrc: string; price: number; category: string; suburb: string; state: string;
  guestCount: number; sleepCount: number; doorCount: number; driveChain: string; fuelType: string; fuelEconomy: number | null;
  year: number; amenities: string[]; instantBook: boolean; reviewAverage: number; reviewCount: number; hostVerified: boolean; hostResponseHours: number | null;
}

export default async function getComparisonListings(ids: string[]) {
  const safeIds = ids.filter((id) => /^[a-f\d]{24}$/i.test(id)).slice(0, 3);
  if (safeIds.length < 2) return [];

  const listings = await prisma.listing.findMany({
    where: { id: { in: safeIds } },
    include: {
      user: { select: { profileVerified: true } },
      reviews: { select: { rating: true } },
      reservations: {
        where: { respondedAt: { not: null } },
        select: { createdAt: true, respondedAt: true },
        orderBy: { respondedAt: "desc" },
        take: 20,
      },
    },
  });

  return safeIds.flatMap<ComparisonVehicle>((id) => {
    const listing = listings.find((item) => item.id === id);
    if (!listing) return [];
    const average = listing.reviews.length ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / listing.reviews.length : 0;
    const responseHours = listing.reservations.flatMap((reservation) => reservation.respondedAt
      ? [(reservation.respondedAt.getTime() - reservation.createdAt.getTime()) / 3_600_000]
      : []);
    return [{
      id: listing.id,
      title: listing.title,
      imageSrc: listing.imageSrcs[0] || "/images/placeholder.png",
      price: listing.price,
      category: listing.category,
      suburb: listing.suburb,
      state: listing.state,
      guestCount: listing.guestCount,
      sleepCount: listing.sleepCount,
      doorCount: listing.doorCount,
      driveChain: listing.driveChain,
      fuelType: listing.fuelType,
      fuelEconomy: listing.fuelEconomy,
      year: listing.year,
      amenities: listing.amenities,
      instantBook: listing.instantBook,
      reviewAverage: Math.round(average * 10) / 10,
      reviewCount: listing.reviews.length,
      hostVerified: listing.user.profileVerified === "Y",
      hostResponseHours: responseHours.length ? Math.round((responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length) * 10) / 10 : null,
    }];
  });
}
