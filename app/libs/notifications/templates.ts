import prisma from "@/app/libs/prismadb";

const DATE_FMT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : DATE_FMT.format(date);
}

export function formatMoney(amount: number | null | undefined, currency = "AUD"): string {
  const value = Math.round(Number(amount || 0));
  return `${currency === "AUD" || currency === "aud" ? "AU$" : ""}${value.toLocaleString("en-AU")}`;
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export interface ReservationCard {
  id: string;
  listingTitle: string;
  suburb: string | null;
  state: string | null;
  startDate: Date;
  endDate: Date;
  nights: number;
  totalFees: number;
  ownerAmount: number;
  guestName: string | null;
  hostName: string | null;
  hostNumber: string | null;
  address: string | null;
  cancellationSummary: string | null;
}

/**
 * One lightweight read used to enrich booking emails without changing every
 * notificationService call signature.
 */
export async function loadReservationCard(reservationId: string): Promise<ReservationCard | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalFees: true,
      totalPrice: true,
      cancellationPolicySnapshot: true,
      user: { select: { name: true } },
      listing: {
        select: {
          title: true,
          suburb: true,
          state: true,
          address: true,
          user: { select: { name: true, number: true } },
        },
      },
    },
  });
  if (!reservation) return null;

  const nights = Math.max(
    1,
    Math.round(
      (reservation.endDate.getTime() - reservation.startDate.getTime()) / 86_400_000,
    ) + 1,
  );
  const snapshot = reservation.cancellationPolicySnapshot as
    | { name?: string; guestSummary?: string }
    | null;

  return {
    id: reservation.id,
    listingTitle: reservation.listing.title,
    suburb: reservation.listing.suburb,
    state: reservation.listing.state,
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    nights,
    totalFees: reservation.totalFees,
    ownerAmount: reservation.totalPrice,
    guestName: reservation.user.name,
    hostName: reservation.listing.user.name,
    hostNumber: reservation.listing.user.number,
    address: reservation.listing.address || null,
    cancellationSummary: snapshot?.guestSummary
      ? `${snapshot.name ?? "Cancellation"} policy: ${snapshot.guestSummary}`
      : null,
  };
}

export function tripFacts(card: ReservationCard): { label: string; value: string }[] {
  return [
    { label: "Vehicle", value: card.listingTitle },
    {
      label: "Location",
      value: [card.suburb, card.state].filter(Boolean).join(", ") || "—",
    },
    { label: "Dates", value: formatDateRange(card.startDate, card.endDate) },
    { label: "Length", value: `${card.nights} day${card.nights === 1 ? "" : "s"}` },
  ];
}
