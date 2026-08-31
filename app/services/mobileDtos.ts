import type { Prisma } from "@prisma/client";

type MobileReservationRecord = Prisma.ReservationGetPayload<{
  include: {
    listing: true;
    user: { select: { id: true; name: true; image: true } };
  };
}>;

export const mobileListingSelect = {
  id: true,
  title: true,
  description: true,
  company: true,
  modal: true,
  category: true,
  year: true,
  imageSrcs: true,
  price: true,
  guestCount: true,
  doorCount: true,
  sleepCount: true,
  fuelType: true,
  driveChain: true,
  amenities: true,
  suburb: true,
  state: true,
  createdAt: true,
  userId: true,
  transmission: true,
  odometer: true,
  seatbeltCount: true,
  dailyKmAllowance: true,
  securityDeposit: true,
  deliveryAvailable: true,
  airportPickup: true,
  petsAllowed: true,
  unsealedRoadsAllowed: true,
  offRoadAllowed: true,
  ancapRating: true,
  safetyFeatures: true,
} satisfies Prisma.ListingSelect;

export type MobileListingRecord = Prisma.ListingGetPayload<{ select: typeof mobileListingSelect }>;

export function toPublicListing(listing: MobileListingRecord, favouriteIds: string[] = []) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    company: listing.company,
    model: listing.modal,
    category: listing.category,
    year: listing.year,
    imageUrls: listing.imageSrcs,
    price: { amountCents: listing.price * 100, currency: "AUD" as const, unit: "day" as const },
    guestCount: listing.guestCount,
    doorCount: listing.doorCount,
    sleepCount: listing.sleepCount,
    fuelType: listing.fuelType,
    driveChain: listing.driveChain,
    transmission: listing.transmission,
    odometer: listing.odometer,
    seatbeltCount: listing.seatbeltCount,
    dailyKmAllowance: listing.dailyKmAllowance,
    securityDeposit: listing.securityDeposit,
    delivery: listing.deliveryAvailable || listing.airportPickup,
    petsAllowed: listing.petsAllowed,
    unsealedRoadsAllowed: listing.unsealedRoadsAllowed || listing.offRoadAllowed,
    ancapRating: listing.ancapRating,
    safetyFeatures: listing.safetyFeatures,
    amenities: listing.amenities,
    approximateLocation: { suburb: listing.suburb, state: listing.state },
    isFavourite: favouriteIds.includes(listing.id),
    createdAt: listing.createdAt.toISOString(),
  };
}

export function toMobileReservation(reservation: MobileReservationRecord, currentUserId: string) {
  const listing = reservation.listing;
  const maySeeExactLocation = listing.userId === currentUserId || ["APPROVED", "ACTIVE", "COMPLETED"].includes(reservation.status);
  return {
    id: reservation.id,
    role: reservation.userId === currentUserId ? "renter" : "owner",
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    startDate: reservation.startDate.toISOString(),
    endDate: reservation.endDate.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    message: reservation.message,
    pricing: {
      basePriceCents: reservation.totalPrice * 100,
      redriveFeeCents: reservation.redriveFee * 100,
      serviceFeeCents: reservation.serviceFee * 100,
      insuranceFeeCents: reservation.insuranceFee * 100,
      totalCents: reservation.totalFees * 100,
      currency: "AUD",
    },
    listing: {
      id: listing.id,
      title: listing.title,
      imageUrl: listing.imageSrcs[0] || null,
      approximateLocation: { suburb: listing.suburb, state: listing.state },
      exactLocation: maySeeExactLocation ? { address: listing.address, latitude: listing.latitude, longitude: listing.longitude } : null,
      ownerId: listing.userId,
    },
    renter: reservation.user ? { id: reservation.user.id, name: reservation.user.name || "", image: reservation.user.image || null } : undefined,
    paymentDueAt: reservation.paymentDueAt?.toISOString() || null,
    cancelledAt: reservation.cancelledAt?.toISOString() || null,
  };
}
