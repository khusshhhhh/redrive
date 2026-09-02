import prisma from "@/app/libs/prismadb";
import { formatTimeOfDay } from "@/app/libs/bookingTimes";
import { resolveListingTimezone, tzAbbrev } from "@/app/libs/timezone";

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

/** "Thu 4 Sep · 10:00 am AEST" — a handover day + time with its zone. */
export function formatHandoverMoment(
  day: Date | string | null | undefined,
  time: string | null | undefined,
  timezone: string,
): string {
  const datePart = formatDate(day);
  const pretty = formatTimeOfDay(time);
  if (pretty === "—") return datePart;
  const abbrev = day ? tzAbbrev(new Date(day), timezone) : "";
  return `${datePart} · ${pretty}${abbrev ? ` ${abbrev}` : ""}`;
}

export interface ReservationCard {
  id: string;
  listingTitle: string;
  suburb: string | null;
  state: string | null;
  timezone: string;
  startDate: Date;
  endDate: Date;
  pickupTime: string | null;
  handoverTime: string | null;
  pickupTimeConfirmed: boolean;
  handoverTimeConfirmed: boolean;
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
      pickupTime: true,
      handoverTime: true,
      pickupTimeConfirmed: true,
      handoverTimeConfirmed: true,
      totalFees: true,
      totalPrice: true,
      cancellationPolicySnapshot: true,
      user: { select: { name: true } },
      listing: {
        select: {
          title: true,
          suburb: true,
          state: true,
          timezone: true,
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
    timezone: resolveListingTimezone(reservation.listing),
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    pickupTime: reservation.pickupTime ?? null,
    handoverTime: reservation.handoverTime ?? null,
    pickupTimeConfirmed: reservation.pickupTimeConfirmed ?? true,
    handoverTimeConfirmed: reservation.handoverTimeConfirmed ?? false,
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

/**
 * Labelled facts for a booking email. Handover times are only included where
 * they're relevant (live bookings) — pass `{ includeTimes: true }`.
 */
export function tripFacts(
  card: ReservationCard,
  opts: { includeTimes?: boolean } = {},
): { label: string; value: string }[] {
  const facts = [
    { label: "Vehicle", value: card.listingTitle },
    {
      label: "Location",
      value: [card.suburb, card.state].filter(Boolean).join(", ") || "—",
    },
    { label: "Dates", value: formatDateRange(card.startDate, card.endDate) },
    { label: "Length", value: `${card.nights} day${card.nights === 1 ? "" : "s"}` },
  ];
  if (opts.includeTimes && card.pickupTime) {
    facts.push({
      label: "Pickup",
      value:
        formatHandoverMoment(card.startDate, card.pickupTime, card.timezone) +
        (card.pickupTimeConfirmed ? "" : " (proposed)"),
    });
  }
  if (opts.includeTimes && card.handoverTime) {
    facts.push({
      label: "Return",
      value:
        formatHandoverMoment(card.endDate, card.handoverTime, card.timezone) +
        (card.handoverTimeConfirmed ? "" : " (proposed)"),
    });
  }
  return facts;
}
