"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CalendarMinus, Check, Loader2 } from "lucide-react";

import toast from "@/app/libs/toast";

interface ChangeRow {
  id: string;
  status: string;
  kind: string;
  newEndDate: string;
  previousEndDate: string;
  extraDays: number;
  extraTotal: number;
  refundAmount: number | null;
}

interface ShortenQuote {
  removedBase: number;
  removedInsuranceFee: number;
  redriveFeeCredit: number;
  serviceFeeCredit: number;
  hireRefund: number;
  refundTotal: number;
  ownerReduction: number;
  remainingDays: number;
  removedDays: number;
}

interface ShortenState {
  currentEndDate: string;
  earliestNewEndDate: string;
  canRequest: boolean;
  preview: {
    paidDays: number;
    newTotalDays: number;
    removedDays: number;
    refundPercentage: number;
    quote: ShortenQuote;
  } | null;
  changes: ChangeRow[];
}

const money = (value: number) => `AU$${Math.round(value).toLocaleString("en-AU")}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const toDateInput = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const dayBefore = (iso: string) => new Date(new Date(iso).getTime() - 86_400_000).toISOString().slice(0, 10);

export default function TripShortenPanel({
  reservationId,
  isHost,
  isGuest,
  onChanged,
}: {
  reservationId: string;
  isHost: boolean;
  isGuest: boolean;
  onChanged?: () => void;
}) {
  const [state, setState] = useState<ShortenState | null>(null);
  const [newEnd, setNewEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (newEndValue?: string) => {
      const qs = newEndValue ? `?newEnd=${encodeURIComponent(new Date(newEndValue).toISOString())}` : "";
      axios
        .get<ShortenState>(`/api/reservations/${reservationId}/shorten${qs}`)
        .then((response) => setState(response.data))
        .catch(() => undefined);
    },
    [reservationId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const request = async () => {
    if (!newEnd) return;
    setBusy(true);
    try {
      const response = await axios.post<{ applied?: boolean; refundAmount?: number }>(
        `/api/reservations/${reservationId}/shorten`,
        { newEndDate: new Date(newEnd).toISOString() },
      );
      toast.success(
        response.data.applied
          ? `Trip shortened — ${money((response.data.refundAmount || 0) / 100)} is on its way to your card.`
          : "Early return requested — the host has been asked to approve it.",
      );
      setNewEnd("");
      load();
      onChanged?.();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "The request could not be sent"
          : "The request could not be sent",
      );
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: string, decision: "APPROVE" | "DECLINE") => {
    setBusy(true);
    try {
      await axios.patch(`/api/reservations/${reservationId}/extend/${id}`, { decision });
      toast.success(decision === "APPROVE" ? "Approved — the guest has been refunded." : "Declined.");
      load();
      onChanged?.();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not respond"
          : "Could not respond",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  const open = state.changes.find((c) => ["PENDING", "APPROVED"].includes(c.status));
  const applied = state.changes.filter((c) => c.status === "APPLIED");
  const showForm = isGuest && state.canRequest && !open;

  if (!open && !showForm && applied.length === 0) return null;

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <CalendarMinus size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Return early</h2>
          <p className="mt-1 text-sm text-muted">
            Finishing sooner? Bring the return date in and get a partial refund for
            the unused days, worked out from this trip&rsquo;s cancellation policy.
          </p>
        </div>
      </div>

      {open && (
        <div className="mt-5 rounded-md border border-hairline-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {Math.abs(open.extraDays)} day{Math.abs(open.extraDays) === 1 ? "" : "s"} earlier · new return {day(open.newEndDate)}
            </p>
            <span className="rounded-full bg-surface-strong px-2.5 py-1 text-xs font-semibold text-ink">
              {open.status === "PENDING" ? "Awaiting host" : "Approved"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Refund: {money((open.refundAmount || 0) / 100)}
          </p>

          {isHost && open.status === "PENDING" && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond(open.id, "APPROVE")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Approve &amp; refund
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond(open.id, "DECLINE")}
                className="inline-flex h-11 items-center justify-center rounded-sm border border-hairline px-4 text-sm font-semibold text-muted disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}
          {isGuest && (
            <p className="mt-2 text-xs text-muted">
              {open.status === "PENDING"
                ? "The host has 48 hours to approve. You can still return the car on the original date if it isn't approved."
                : "Approved — your refund is processing."}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="mt-5 rounded-md border border-hairline-soft p-4">
          <label className="block text-xs font-semibold text-ink">
            New return date
            <input
              type="date"
              value={newEnd}
              min={toDateInput(state.earliestNewEndDate)}
              max={dayBefore(state.currentEndDate)}
              onChange={(event) => {
                setNewEnd(event.target.value);
                if (event.target.value) load(event.target.value);
              }}
              className="mt-1.5 h-11 w-full rounded-sm border border-hairline bg-white px-3 text-sm font-normal"
            />
          </label>

          {state.preview && state.preview.removedDays > 0 && (
            <div className="mt-3 rounded-sm bg-surface-soft p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">
                  {state.preview.removedDays} unused day{state.preview.removedDays === 1 ? "" : "s"}
                </span>
                <span>{money(state.preview.quote.removedBase + state.preview.quote.removedInsuranceFee)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted">Refundable at {state.preview.refundPercentage}%</span>
                <span>{money(state.preview.quote.hireRefund)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted">Fees credited back</span>
                <span>{money(state.preview.quote.redriveFeeCredit + state.preview.quote.serviceFeeCredit)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-hairline-soft pt-2 font-semibold text-ink">
                <span>Refund to your card</span>
                <span>{money(state.preview.quote.refundTotal)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={busy || !newEnd || !state.preview}
            onClick={() => void request()}
            className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarMinus size={16} />}
            Request early return
          </button>
        </div>
      )}

      {applied.length > 0 && (
        <p className="mt-4 text-xs text-muted">
          Shortened {applied.length} time{applied.length === 1 ? "" : "s"} · now ends {day(state.currentEndDate)}
          {applied[0].refundAmount ? ` · refunded ${money(applied.reduce((sum, c) => sum + (c.refundAmount || 0), 0) / 100)}` : ""}.
        </p>
      )}
    </section>
  );
}
