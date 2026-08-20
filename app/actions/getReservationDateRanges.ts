import prisma from "@/app/libs/prismadb";

export default async function getReservationDateRanges(listingId: string) {
  const reservations = await prisma.reservation.findMany({
    where: {
      listingId,
      status: { notIn: ["DECLINED", "CANCELLED", "EXPIRED"] },
    },
    select: { id: true, startDate: true, endDate: true, status: true },
    orderBy: { startDate: "asc" },
  });

  return reservations.map((reservation) => ({
    ...reservation,
    startDate: reservation.startDate.toISOString(),
    endDate: reservation.endDate.toISOString(),
  }));
}
