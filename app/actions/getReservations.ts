import prisma from "@/app/libs/prismadb";
import {
  serializeReservation,
  RESERVATIONS_PAGE_SIZE,
} from "@/app/libs/reservationSerializer";

interface IParams {
  listingId?: string;
  /** Trips this user booked (guest view). */
  userId?: string;
  /** Reservations on listings this user owns (host view). */
  authorId?: string;
  /** Reservation status to filter by. */
  status?: string;
  /** Id of the last reservation from the previous page. */
  cursor?: string;
  limit?: number;
}

export interface ReservationsPage {
  reservations: ReturnType<typeof serializeReservation>[];
  nextCursor: string | null;
}

export default async function getReservations(params: IParams): Promise<ReservationsPage> {
  try {
    const { listingId, userId, authorId, status, cursor } = await params;
    const limit = Math.min(Math.max(1, params.limit ?? RESERVATIONS_PAGE_SIZE), 50);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};
    if (listingId) query.listingId = listingId;
    if (userId) query.userId = userId;
    if (authorId) query.listing = { userId: authorId };
    if (status) query.status = status;

    const rows = await prisma.reservation.findMany({
      where: query,
      include: { listing: true, user: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      reservations: page.map(serializeReservation),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load reservations");
  }
}
