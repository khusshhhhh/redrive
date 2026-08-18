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

    // ✅ Convert all Date fields to ISO strings for TypeScript compatibility
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
        ...reservation.user,
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
      },
      listing: {
        ...reservation.listing,
        createdAt: reservation.listing.createdAt.toISOString(),
        regoImage: reservation.listing.regoImage ?? "", // ✅ Ensure regoImage is always a string
      },
    }));

    return safeReservations;
  } catch (error) {
    throw new Error(error);
  }
}
