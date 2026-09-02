"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { CalendarPlus, Check, Loader2 } from "lucide-react";

import toast from "@/app/libs/toast";

interface ExtensionRow {
  id: string;
  status: string;
  extraDays: number;
  extraTotal: number;
  newEndDate: string;
  previousEndDate: string;
}

interface ExtendState {
  currentEndDate: string;
  maxNewEndDate: string;
  canRequest: boolean;
  extraDays: number;
  quote: {
    extraBase: number;
    extraInsuranceFee: number;
    extraRedriveFee: number;
    extraServiceFee: number;
    extraTotal: number;
  } | null;
  extensions: ExtensionRow[];
}

const money = (cents: number) => `AU$${Math.round(cents).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const toDateInput = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export default function TripExtensionPanel({
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
  const [state, setState] = useState<ExtendState | null>(null);
  const [newEnd, setNewEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedCard, setSavedCard] = useState<{ id: string; brand: string; last4: string } | null>(null);
  const autoPay = useRef(false);

  useEffect(() => {
    if (!isGuest) return;
    axios
      .get<{ cards: { id: string; brand: string; last4: string }[] }>("/api/payments/methods")
      .then((r) => setSavedCard(r.data.cards?.[0] || null))
      .catch(() => undefined);
  }, [isGuest]);

  const load = useCallback(
    (newEndValue?: string) => {
      const qs = newEndValue ? `?newEnd=${encodeURIComponent(new Date(newEndValue).toISOString())}` : "";
      axios
        .get<ExtendState>(`/api/reservations/${reservationId}/extend${qs}`)
        .then((response) => setState(response.data))
        .catch(() => undefined);
    },
    [reservationId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const payExtension = useCallback(
    async (extensionId: string, paymentMethodId?: string) => {
      setBusy(true);
      try {
        const response = await axios.post<{ url?: string; paid?: boolean }>(
          `/api/reservations/${reservationId}/extend/${extensionId}/pay`,
          paymentMethodId ? { paymentMethodId } : undefined,
        );
        if (response.data.url) {
          window.location.assign(response.data.url);
          return;
        }
        if (response.data.paid) {
          toast.success("Trip extended — the new dates are confirmed.");
          load();
          onChanged?.();
        }
        setBusy(false);
      } catch (error) {
        toast.error(
          axios.isAxiosError<{ error?: string }>(error)
            ? error.response?.data?.error || "Checkout could not be opened"
            : "Checkout could not be opened",
        );
        setBusy(false);
      }
    },
    [reservationId, load, onChanged],
  );

  // Land from a "Pay & extend" link.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("extpay");
    if (id && isGuest && !autoPay.current) {
      autoPay.current = true;
      void payExtension(id);
    }
  }, [isGuest, payExtension]);

  const request = async () => {
    if (!newEnd) return;
    setBusy(true);
    try {
      await axios.post(`/api/reservations/${reservationId}/extend`, {
        newEndDate: new Date(newEnd).toISOString(),
      });
      toast.success("Extension requested — the host has been asked to approve it.");
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

  const respond = async (extensionId: string, decision: "APPROVE" | "DECLINE") => {
    setBusy(true);
    try {
      await axios.patch(`/api/reservations/${reservationId}/extend/${extensionId}`, { decision });
      toast.success(decision === "APPROVE" ? "Approved — the guest can pay now." : "Declined.");
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

  const open = state.extensions.find((e) => ["PENDING", "APPROVED"].includes(e.status));
  const showRequestForm = isGuest && state.canRequest && !open;

  if (!open && !showRequestForm) {
    // Nothing actionable and no history worth showing.
    if (state.extensions.length === 0) return null;
  }

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <CalendarPlus size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Trip length</h2>
          <p className="mt-1 text-sm text-muted">
            Keeping the vehicle a bit longer? Request extra days here — the dates and price update once
            the host approves and you pay the difference.
          </p>
        </div>
      </div>

      {open && (
        <div className="mt-5 rounded-md border border-hairline-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              +{open.extraDays} day{open.extraDays === 1 ? "" : "s"} · new return {day(open.newEndDate)}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                open.status === "APPROVED" ? "bg-amber-50 text-amber-800" : "bg-surface-strong text-ink"
              }`}
            >
              {open.status === "PENDING" ? "Awaiting host" : "Approved — payment due"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Extra cost: {money(open.extraTotal)}</p>

          {isGuest && open.status === "APPROVED" && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={busy}
                onClick={() => void payExtension(open.id, savedCard?.id)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {savedCard
                  ? `Pay ${money(open.extraTotal)} · ···· ${savedCard.last4}`
                  : `Pay ${money(open.extraTotal)} & extend`}
              </button>
              {savedCard && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void payExtension(open.id)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-hairline px-4 text-sm font-semibold text-muted disabled:opacity-50"
                >
                  Use a different card
                </button>
              )}
            </div>
          )}

          {isHost && open.status === "PENDING" && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond(open.id, "APPROVE")}
                className="h-11 rounded-sm bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void respond(open.id, "DECLINE")}
                className="h-11 rounded-sm border border-hairline px-4 text-sm font-semibold text-muted"
              >
                Decline
              </button>
            </div>
          )}
          {isHost && open.status === "APPROVED" && (
            <p className="mt-2 text-xs text-muted">Waiting for the guest to pay.</p>
          )}
        </div>
      )}

      {showRequestForm && (
        <div className="mt-5 rounded-md border border-hairline-soft p-4">
          <label className="block text-xs font-semibold text-ink">
            New return date
            <input
              type="date"
              value={newEnd}
              min={toDateInput(state.currentEndDate)}
              max={toDateInput(state.maxNewEndDate)}
              onChange={(event) => {
                setNewEnd(event.target.value);
                if (event.target.value) load(event.target.value);
              }}
              className="mt-1.5 h-11 w-full rounded-sm border border-hairline bg-white px-3 text-sm font-normal"
            />
          </label>

          {state.quote && state.extraDays > 0 && (
            <div className="mt-3 rounded-sm bg-surface-soft p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Extra hire ({state.extraDays} day{state.extraDays === 1 ? "" : "s"})</span><span>{money(state.quote.extraBase)}</span></div>
              {state.quote.extraInsuranceFee > 0 && (
                <div className="mt-1 flex justify-between"><span className="text-muted">Protection</span><span>{money(state.quote.extraInsuranceFee)}</span></div>
              )}
              <div className="mt-1 flex justify-between"><span className="text-muted">Fees</span><span>{money(state.quote.extraRedriveFee + state.quote.extraServiceFee)}</span></div>
              <div className="mt-2 flex justify-between border-t border-hairline-soft pt-2 font-semibold text-ink"><span>Extra to pay</span><span>{money(state.quote.extraTotal)}</span></div>
            </div>
          )}

          <button
            type="button"
            disabled={busy || !newEnd || !state.quote}
            onClick={() => void request()}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
            Request these dates
          </button>
        </div>
      )}

      {state.extensions.filter((e) => e.status === "PAID").length > 0 && (
        <p className="mt-4 text-xs text-muted">
          Extended {state.extensions.filter((e) => e.status === "PAID").length} time
          {state.extensions.filter((e) => e.status === "PAID").length === 1 ? "" : "s"} · now booked to{" "}
          {day(state.currentEndDate)}.
        </p>
      )}
    </section>
  );
}
