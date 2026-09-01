"use client";

import { useState } from "react";
import { BadgeCheck, IdCard, ShieldAlert, Star } from "lucide-react";

export interface ReservationDriver {
  role: string;
  name: string;
  looksAustralian: boolean;
  detectedState: string | null;
  frontUrl: string;
  backUrl: string | null;
}

export interface GuestTrack {
  ratingAvg: number | null;
  ratingCount: number;
  tripsCompleted: number;
}

export default function DriversCard({
  drivers,
  viewerIsOwner,
  guestTrack,
}: {
  drivers: ReservationDriver[];
  viewerIsOwner: boolean;
  guestTrack?: GuestTrack | null;
}) {
  if (!drivers || drivers.length === 0) return null;

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <IdCard size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">
            {drivers.length > 1 ? "Drivers" : "Driver"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {viewerIsOwner
              ? "The licences uploaded with this request. Redrive checks that each reads as a current Australian licence."
              : "The licence photos you uploaded with this request. Only the host of this vehicle can see them."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {drivers.map((driver) => (
          <DriverRow key={driver.role} driver={driver} />
        ))}
      </div>

      {viewerIsOwner && guestTrack && (guestTrack.tripsCompleted > 0 || guestTrack.ratingCount > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline-soft pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">On Redrive</span>
          {guestTrack.ratingCount > 0 && guestTrack.ratingAvg != null && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {guestTrack.ratingAvg.toFixed(1)}
              <span className="font-normal text-muted">
                ({guestTrack.ratingCount} host review{guestTrack.ratingCount === 1 ? "" : "s"})
              </span>
            </span>
          )}
          <span className="text-sm text-ink">
            {guestTrack.tripsCompleted} completed trip{guestTrack.tripsCompleted === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </section>
  );
}

function DriverRow({ driver }: { driver: ReservationDriver }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-hairline-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {driver.role === "PRIMARY" ? "Primary driver" : "Second driver"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{driver.name}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            driver.looksAustralian
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {driver.looksAustralian ? <BadgeCheck size={13} /> : <ShieldAlert size={13} />}
          {driver.looksAustralian
            ? driver.detectedState
              ? `${driver.detectedState} licence`
              : "Australian licence"
            : "Not auto-checked"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-xs font-semibold text-primary hover:text-primary-active"
      >
        {open ? "Hide licence photos" : "View licence photos"}
      </button>

      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={driver.frontUrl}
            alt={`${driver.name} — front of licence`}
            className="w-full rounded-sm border border-hairline-soft object-cover"
            loading="lazy"
          />
          {driver.backUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={driver.backUrl}
              alt={`${driver.name} — back of licence`}
              className="w-full rounded-sm border border-hairline-soft object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
    </div>
  );
}
