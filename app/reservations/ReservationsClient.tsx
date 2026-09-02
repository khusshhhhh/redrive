"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, ChevronRight, MapPin, UsersRound } from "lucide-react";

import Container from "../components/Container";
import CancelBookingDialog from "../components/reservations/CancelBookingDialog";
import type { SafeReservation, SafeUser } from "../types";
import { calculateCancellationOutcome } from "../libs/cancellationPolicy";

interface ReservationsClientProps {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
}

const statusStyle: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  REVIEWING: "bg-surface-strong text-primary-active",
};

export default function ReservationsClient({ reservations }: ReservationsClientProps) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<SafeReservation | null>(null);

  const onCancel = useCallback((reservation: SafeReservation) => {
    setCancelTarget(reservation);
  }, []);

  return (
    <main className="bg-surface-soft/40 py-8 sm:py-12">
      <Container>
        <div className="mx-auto max-w-[1120px]">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Hosting</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Reservations</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Review booking requests and keep upcoming handovers organised.</p>
          </header>

          <div className="space-y-4">
            {reservations.map((reservation) => {
              const listing = reservation.listing;
              const canCancel = ["REVIEWING", "APPROVED"].includes(reservation.status)
                && calculateCancellationOutcome({ policy: reservation.cancellationPolicy, pickupAt: reservation.startDate, cancelledByHost: true }).canCancel;
              const hasPaid = ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "");
              return (
                <article key={reservation.id} className="overflow-hidden rounded-md border border-hairline-soft bg-white shadow-card">
                  <div className="grid md:grid-cols-[220px_1fr_auto]">
                    <div className="relative min-h-48 md:min-h-full">
                      <Image src={listing.imageSrcs?.[0] || "/images/placeholder.png"} alt={listing.title} fill sizes="(max-width: 768px) 100vw, 220px" className="object-cover" />
                    </div>
                    <div className="min-w-0 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle[reservation.status] || "bg-surface-soft text-muted"}`}>{reservation.status === "REVIEWING" ? "Awaiting response" : reservation.status.toLowerCase()}</span>
                          <h2 className="mt-3 text-xl font-semibold text-ink">{listing.title}</h2>
                        </div>
                        <p className="text-lg font-semibold text-ink">AU${reservation.totalFees}</p>
                      </div>
                      <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2">
                        <p className="flex items-center gap-2"><CalendarDays size={16} className="text-primary" />{format(new Date(reservation.startDate), "d MMM")} – {format(new Date(reservation.endDate), "d MMM yyyy")}</p>
                        <p className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{listing.suburb}, {listing.state}</p>
                        <p className="flex items-center gap-2 sm:col-span-2"><UsersRound size={16} className="text-primary" />Booked by {reservation.user.name || reservation.user.email || "Guest"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-hairline-soft p-4 md:w-44 md:flex-col md:justify-center md:border-l md:border-t-0">
                      <button onClick={() => router.push(`/reservations/${reservation.id}`)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-sm bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-active md:w-full md:flex-none">Details <ChevronRight size={16} /></button>
                      {canCancel && <button onClick={() => onCancel(reservation)} className="h-11 flex-1 rounded-sm border border-hairline px-4 text-sm font-semibold text-muted transition hover:border-error hover:text-error disabled:opacity-50 md:w-full md:flex-none">{hasPaid ? "Cancel · full refund" : "Decline request"}</button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
      <CancelBookingDialog
        reservation={cancelTarget}
        role="HOST"
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => router.refresh()}
      />
    </main>
  );
}
