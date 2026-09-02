"use client";

import { useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Clock3, Pencil, Check, X, Lock } from "lucide-react";
import toast from "@/app/libs/toast";
import {
  effectivePickupWindow,
  formatTimeOfDay,
  formatWindow,
  isValidTimeOfDay,
  ownerRole,
  withinWindow,
} from "@/app/libs/bookingTimes";
import { resolveListingTimezone, tzAbbrev } from "@/app/libs/timezone";
import TimeSlotSelect from "@/app/components/inputs/TimeSlotSelect";
import type { SafeReservation } from "@/app/types";

interface Props {
  reservation: SafeReservation;
  isHost: boolean;
  isGuest: boolean;
  onChanged: () => void;
}

const PICKUP_EDITABLE = ["REVIEWING", "APPROVED", "ACTIVE"];
const HANDOVER_EDITABLE = ["APPROVED", "ACTIVE"];
const PAID = ["PAID_HELD", "RELEASED"];

export default function PickupHandoverTimes({ reservation, isHost, isGuest, onChanged }: Props) {
  const viewerRole: "HOST" | "GUEST" | null = isHost ? "HOST" : isGuest ? "GUEST" : null;
  const paid = PAID.includes(reservation.paymentStatus || "");
  const zone = resolveListingTimezone(reservation.listing);
  const tz = tzAbbrev(new Date(reservation.startDate), zone);

  const canEditPickup = !!viewerRole && PICKUP_EDITABLE.includes(reservation.status);
  const canEditHandover = !!viewerRole && HANDOVER_EDITABLE.includes(reservation.status) && paid;

  const win = formatWindow(reservation.listing.pickupWindowStart, reservation.listing.pickupWindowEnd);
  const eff = effectivePickupWindow(
    reservation.listing.pickupWindowStart,
    reservation.listing.pickupWindowEnd,
  );
  const windowLabel = win || `${formatWindow(eff.start, eff.end)} (default)`;

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <Clock3 size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Pickup &amp; return times</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            The host owns the pickup time; the guest owns the return. Either of you can propose a
            change — it&rsquo;s confirmed by the other side, who is always notified{tz ? ` · times in ${tz}` : ""}.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TimeRow
          reservationId={reservation.id}
          expectedUpdatedAt={reservation.updatedAt}
          kind="PICKUP"
          label="Pickup"
          day={reservation.startDate}
          time={reservation.pickupTime ?? null}
          confirmed={reservation.pickupTimeConfirmed ?? true}
          proposedByRole={reservation.pickupTimeProposedByRole ?? null}
          setByRole={reservation.pickupTimeSetByRole ?? null}
          viewerRole={viewerRole}
          canEdit={canEditPickup}
          lockedReason={
            viewerRole && !PICKUP_EDITABLE.includes(reservation.status)
              ? "The pickup time is locked now the trip has ended."
              : null
          }
          windowStart={reservation.listing.pickupWindowStart}
          windowEnd={reservation.listing.pickupWindowEnd}
          windowLabel={windowLabel}
          tz={tz}
          onChanged={onChanged}
        />
        <TimeRow
          reservationId={reservation.id}
          expectedUpdatedAt={reservation.updatedAt}
          kind="HANDOVER"
          label="Return"
          day={reservation.endDate}
          time={reservation.handoverTime ?? null}
          confirmed={reservation.handoverTimeConfirmed ?? false}
          proposedByRole={reservation.handoverTimeProposedByRole ?? null}
          setByRole={reservation.handoverTimeSetByRole ?? null}
          viewerRole={viewerRole}
          canEdit={canEditHandover}
          fullDay
          lockedReason={
            viewerRole && !canEditHandover
              ? paid
                ? "The return time can be set once the booking is confirmed."
                : "The return time can be set once payment is secured."
              : null
          }
          tz={tz}
          onChanged={onChanged}
        />
      </div>
    </section>
  );
}

function TimeRow({
  reservationId,
  expectedUpdatedAt,
  kind,
  label,
  day,
  time,
  confirmed,
  proposedByRole,
  setByRole,
  viewerRole,
  canEdit,
  fullDay,
  lockedReason,
  windowStart,
  windowEnd,
  windowLabel,
  tz,
  onChanged,
}: {
  reservationId: string;
  expectedUpdatedAt?: string;
  kind: "PICKUP" | "HANDOVER";
  label: string;
  day: string;
  time: string | null;
  confirmed: boolean;
  proposedByRole: string | null;
  setByRole: string | null;
  viewerRole: "HOST" | "GUEST" | null;
  canEdit: boolean;
  fullDay?: boolean;
  lockedReason?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  windowLabel?: string | null;
  tz?: string;
  onChanged: () => void;
}) {
  const owner = ownerRole(kind);
  const viewerIsOwner = viewerRole === owner;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(time ?? "10:00");
  const [saving, setSaving] = useState(false);

  const draftValid =
    isValidTimeOfDay(draft) &&
    (kind === "HANDOVER" ||
      viewerIsOwner ||
      draft === time ||
      withinWindow(draft, windowStart, windowEnd));

  const send = async (payload: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      await axios.patch(`/api/reservations/${reservationId}/times`, {
        kind,
        expectedUpdatedAt,
        ...payload,
      });
      toast.success(successMsg);
      setEditing(false);
      onChanged();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; code?: string } } };
      if (err.response?.data?.code === "STALE") onChanged();
      toast.error(err.response?.data?.error || "Could not update the time");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!draftValid) {
      toast.error(
        kind === "PICKUP" ? "Choose a time inside the host's window" : "Enter a valid time",
      );
      return;
    }
    void send(
      { action: "SET", time: draft },
      viewerIsOwner ? `${label} time updated` : `${label} time proposed`,
    );
  };

  const confirmProposal = () => void send({ action: "CONFIRM" }, `${label} time confirmed`);

  const pending = time && !confirmed && proposedByRole;
  const proposedByYou = pending && proposedByRole === viewerRole;
  const proposerWord = proposedByRole === "HOST" ? "the host" : "the guest";

  const startEditing = () => {
    setDraft(time ?? "10:00");
    setEditing(true);
  };

  return (
    <div className="rounded-sm bg-surface-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{format(new Date(day), "EEEE, d MMMM")}</p>

      {editing ? (
        <div className="mt-3">
          <TimeSlotSelect
            label={`New ${label.toLowerCase()} time`}
            value={draft}
            onChange={setDraft}
            windowStart={windowStart}
            windowEnd={windowEnd}
            fullDay={fullDay}
            hint={
              kind === "PICKUP" && windowLabel && !viewerIsOwner
                ? `Must be inside the host's window: ${windowLabel}`
                : undefined
            }
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving || !draftValid}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-active disabled:opacity-50"
            >
              <Check size={14} /> {viewerIsOwner ? "Save" : "Propose"}
            </button>
            <button
              onClick={() => {
                setDraft(time ?? "10:00");
                setEditing(false);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-hairline px-3 text-xs font-semibold text-muted hover:text-ink"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">
                {time ? (
                  <>
                    {formatTimeOfDay(time)}
                    {tz ? <span className="ml-1 text-xs font-medium text-muted">{tz}</span> : null}
                  </>
                ) : (
                  <span className="text-muted">Not set yet</span>
                )}
              </p>
              {time && confirmed && setByRole && (
                <p className="mt-0.5 text-xs text-muted">
                  Confirmed · set by {setByRole === "HOST" ? "the host" : "the guest"}
                </p>
              )}
              {pending && !proposedByYou && (
                <p className="mt-0.5 text-xs font-medium text-amber-700">
                  Proposed by {proposerWord} — needs your confirmation
                </p>
              )}
              {pending && proposedByYou && (
                <p className="mt-0.5 text-xs text-muted">Proposed by you — waiting on {owner === "HOST" ? "the host" : "the guest"}</p>
              )}
            </div>
            {canEdit && (
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {pending && !proposedByYou && viewerIsOwner && (
                  <button
                    onClick={confirmProposal}
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-active disabled:opacity-50"
                  >
                    <Check size={14} /> Confirm
                  </button>
                )}
                <button
                  onClick={startEditing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-ink px-3 text-xs font-semibold text-ink hover:bg-white"
                >
                  <Pencil size={13} />{" "}
                  {!time ? "Set time" : pending && !proposedByYou ? "Adjust" : "Change"}
                </button>
              </div>
            )}
          </div>
          {!canEdit && lockedReason && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Lock size={12} /> {lockedReason}
            </p>
          )}
        </>
      )}
    </div>
  );
}
