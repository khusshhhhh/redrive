import prisma from "@/app/libs/prismadb";

interface IParams {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

export default async function getReservations(params: IParams) {
  try {
    const awaitedParams = await params;
    const { listingId, userId, authorId } = awaitedParams;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (listingId) {
      query.listingId = listingId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (authorId) {
      query.listing = { userId: authorId };
    }

    const reservations = await prisma.reservation.findMany({
      where: query,
      include: {
        listing: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const safeReservations = reservations.map((reservation) => ({
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      respondedAt: reservation.respondedAt?.toISOString() ?? null,
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
      pickupAddressReleasedAt:
        reservation.pickupAddressReleasedAt?.toISOString() ?? null,
      paidAt: reservation.paidAt?.toISOString() ?? null,
      completedAt: reservation.completedAt?.toISOString() ?? null,
      paymentDueAt: reservation.paymentDueAt?.toISOString() ?? null,
      user: {
        id: reservation.user.id,
        name: reservation.user.name,
        email: reservation.user.email,
        number: reservation.user.number,
        dateOfBirth: reservation.user.dateOfBirth,
        image: reservation.user.image,
        favoriteIds: reservation.user.favoriteIds,
        streetAddress: reservation.user.streetAddress,
        suburb: reservation.user.suburb,
        state: reservation.user.state,
        postcode: reservation.user.postcode,
        hobbies: reservation.user.hobbies,
        dreamDestinations: reservation.user.dreamDestinations,
        licenseImage: reservation.user.licenseImage,
        licenseType: reservation.user.licenseType,
        licenseStatus: reservation.user.licenseStatus,
        profileVerified: reservation.user.profileVerified,
        loginOtpEnabled: reservation.user.loginOtpEnabled,
        createdAt: reservation.user.createdAt.toISOString(),
        updatedAt: reservation.user.updatedAt.toISOString(),
        emailVerified: reservation.user.emailVerified
          ? reservation.user.emailVerified.toISOString()
          : null,
        lastActiveAt: reservation.user.lastActiveAt
          ? reservation.user.lastActiveAt.toISOString()
          : null,
        licenseExpiresAt: reservation.user.licenseExpiresAt
          ? reservation.user.licenseExpiresAt.toISOString()
          : null,
        licenseExpiryDate: reservation.user.licenseExpiryDate,
        licenseIssuerState: reservation.user.licenseIssuerState,
        licenseHolderName: reservation.user.licenseHolderName,
        licenseNumberLast4: reservation.user.licenseNumberLast4,
        licenseCardLast4: reservation.user.licenseCardLast4,
        licenseNameMatches: reservation.user.licenseNameMatches,
        licenseDobMatches: reservation.user.licenseDobMatches,
        licenseClassificationConfidence: reservation.user.licenseClassificationConfidence,
        licenseVerifiedAt: reservation.user.licenseVerifiedAt?.toISOString() ?? null,
        licenseRejectionReason: reservation.user.licenseRejectionReason,
      },
      listing: {
        ...reservation.listing,
        createdAt: reservation.listing.createdAt.toISOString(),
        regoImage: "",
      },
    }));

    return safeReservations;
  } catch (error) {
    throw new Error(error);
  }
}
