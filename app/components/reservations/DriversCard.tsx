"use client";

import { useState } from "react";
import axios from "axios";
import { BadgeCheck, IdCard, Loader2, Plus, ShieldAlert, Star, Upload } from "lucide-react";

import toast from "@/app/libs/toast";

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
  reservationId,
  canAddDriver = false,
  onChanged,
}: {
  drivers: ReservationDriver[];
  viewerIsOwner: boolean;
  guestTrack?: GuestTrack | null;
  reservationId?: string;
  canAddDriver?: boolean;
  onChanged?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [check, setCheck] = useState<{ frontPublicId: string; detectedState: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadLicence = async (file: File) => {
    setBusy("upload");
    setError(null);
    setCheck(null);
    try {
      const form = new FormData();
      form.append("front", file);
      const response = await fetch("/api/reservations/driver-licence", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (!data.looksAustralian) {
        setError(data.reason || "That didn't read as an Australian licence.");
      } else {
        setCheck({ frontPublicId: data.frontPublicId, detectedState: data.detectedState });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const saveDriver = async () => {
    if (!reservationId || !check || name.trim().length < 2) return;
    setBusy("save");
    try {
      await axios.post(`/api/reservations/${reservationId}/drivers`, {
        name: name.trim(),
        frontPublicId: check.frontPublicId,
      });
      toast.success("Driver added — the host has been notified.");
      setAdding(false);
      setName("");
      setCheck(null);
      onChanged?.();
    } catch (e) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error || "Could not add the driver" : "Could not add the driver",
      );
    } finally {
      setBusy(null);
    }
  };

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

      {canAddDriver && !viewerIsOwner && drivers.length < 4 && (
        <div className="mt-3">
          {adding ? (
            <div className="rounded-md border border-hairline-soft p-4">
              <label className="block text-xs font-semibold text-ink">
                Driver&rsquo;s full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 120))}
                  className="mt-1.5 h-11 w-full rounded-sm border border-hairline bg-white px-3 text-sm font-normal outline-none focus:border-primary"
                  placeholder="As printed on the licence"
                />
              </label>
              <label className="mt-3 inline-flex h-11 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border-strong px-3 text-xs font-semibold text-ink hover:bg-surface-soft">
                {busy === "upload" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {check ? "Replace licence photo" : "Upload licence photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLicence(file);
                  }}
                />
              </label>
              {check && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck size={14} />
                  {check.detectedState ? `${check.detectedState} licence detected` : "Australian licence detected"}
                </p>
              )}
              {error && (
                <p className="mt-2 flex gap-1.5 text-xs leading-5 text-amber-800">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null || !check || name.trim().length < 2}
                  onClick={() => void saveDriver()}
                  className="h-9 rounded-sm bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy === "save" ? "Adding…" : "Add driver"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setCheck(null); setError(null); }}
                  className="h-9 rounded-sm border border-hairline px-3 text-xs font-semibold text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-active"
            >
              <Plus size={15} /> Add another driver
            </button>
          )}
        </div>
      )}

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {driver.role === "PRIMARY" ? "Primary driver" : "Second driver"}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">{driver.name}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-auto ${
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
