"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import toast from "@/app/libs/toast";

interface AdminIncident {
  id: string;
  reservationId: string;
  type: string;
  status: string;
  summary: string;
  responderStatement: string | null;
  resolution: string | null;
  resolutionOutcome: string | null;
  resolutionAmount: number | null;
  createdAt: string;
  reservation: {
    startDate: string;
    endDate: string;
    totalPrice: number;
    totalFees: number;
    paymentStatus: string;
    user: { name: string | null; email: string | null };
    listing: {
      title: string;
      securityDeposit: number | null;
      user: { name: string | null; email: string | null };
    };
  } | null;
}

const OUTCOMES = [
  ["NO_ACTION", "No action — release payout"],
  ["GOODWILL", "Goodwill credit (record only)"],
  ["DEPOSIT_DEDUCTION", "Deposit deduction (record only)"],
  ["PARTIAL_REFUND", "Partial refund to guest (record only)"],
] as const;

const dt = (value: string) =>
  new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function AdminIncidents() {
  const [scope, setScope] = useState<"open" | "escalated" | "all">("open");
  const [rows, setRows] = useState<AdminIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { outcome: string; amount: string; note: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    axios
      .get<AdminIncident[]>(`/api/admin/incidents?scope=${scope}`)
      .then((response) => setRows(response.data))
      .catch(() => toast.error("Could not load incidents"))
      .finally(() => setLoading(false));
  }, [scope]);

  useEffect(load, [load]);

  const resolve = async (incident: AdminIncident) => {
    const entry = draft[incident.id] ?? { outcome: "NO_ACTION", amount: "", note: "" };
    if (entry.note.trim().length < 5) {
      toast.error("Add a resolution note");
      return;
    }
    setBusyId(incident.id);
    try {
      await axios.patch(`/api/reservations/${incident.reservationId}/incidents/${incident.id}`, {
        action: "RESOLVE",
        outcome: entry.outcome,
        amount: entry.amount ? Number(entry.amount) : undefined,
        resolution: entry.note.trim(),
      });
      toast.success("Incident resolved");
      load();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not resolve"
          : "Could not resolve",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-8">
      <div className="flex gap-2">
        {(["open", "escalated", "all"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setScope(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              scope === value ? "bg-ink text-white" : "border border-hairline text-muted"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 h-40 rounded-lg bg-surface-soft" />
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-hairline bg-white px-5 py-8 text-center text-sm text-muted">
          Nothing here.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((incident) => {
            const entry = draft[incident.id] ?? { outcome: "NO_ACTION", amount: "", note: "" };
            const active = incident.status !== "RESOLVED";
            return (
              <article key={incident.id} className="rounded-lg border border-hairline-soft bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {incident.reservation?.listing.title ?? "Unknown vehicle"}{" "}
                      <span className="text-xs font-normal text-muted">· {incident.type.replace(/_/g, " ")}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Reported {dt(incident.createdAt)}
                      {incident.reservation
                        ? ` · trip ${dt(incident.reservation.startDate)}–${dt(incident.reservation.endDate)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      incident.status === "RESOLVED"
                        ? "bg-emerald-50 text-emerald-700"
                        : incident.status === "ESCALATED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {incident.status.replace(/_/g, " ")}
                  </span>
                </div>

                {incident.reservation && (
                  <div className="mt-3 grid gap-1 text-xs text-muted sm:grid-cols-2">
                    <span>Guest: {incident.reservation.user.name} ({incident.reservation.user.email})</span>
                    <span>Host: {incident.reservation.listing.user.name} ({incident.reservation.listing.user.email})</span>
                    <span>Payment: {incident.reservation.paymentStatus}</span>
                    <span>
                      Host payout: AU${incident.reservation.totalPrice.toLocaleString("en-AU")} · Deposit on listing:{" "}
                      {incident.reservation.listing.securityDeposit
                        ? `AU$${incident.reservation.listing.securityDeposit.toLocaleString("en-AU")}`
                        : "none"}
                    </span>
                  </div>
                )}

                <p className="mt-3 text-sm leading-6 text-body">
                  <span className="font-semibold text-ink">Reporter:</span> {incident.summary}
                </p>
                {incident.responderStatement && (
                  <p className="mt-2 rounded-sm bg-surface-soft p-2.5 text-sm leading-6 text-body">
                    <span className="font-semibold text-ink">Response:</span> {incident.responderStatement}
                  </p>
                )}
                {incident.resolution && (
                  <p className="mt-2 rounded-sm border border-emerald-200 bg-emerald-50 p-2.5 text-sm leading-6 text-body">
                    <span className="font-semibold text-ink">
                      Resolved ({incident.resolutionOutcome?.replace(/_/g, " ").toLowerCase()}
                      {incident.resolutionAmount ? ` · AU$${incident.resolutionAmount.toLocaleString("en-AU")}` : ""})
                    </span>
                    : {incident.resolution}
                  </p>
                )}

                {active && (
                  <div className="mt-4 space-y-2 border-t border-hairline-soft pt-4">
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={entry.outcome}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [incident.id]: { ...entry, outcome: event.target.value },
                          }))
                        }
                        className="rounded-sm border border-hairline bg-white px-2 py-1.5 text-sm"
                      >
                        {OUTCOMES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {entry.outcome !== "NO_ACTION" && (
                        <input
                          type="number"
                          min={0}
                          value={entry.amount}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              [incident.id]: { ...entry, amount: event.target.value },
                            }))
                          }
                          placeholder="AU$ amount"
                          className="w-32 rounded-sm border border-hairline bg-white px-2 py-1.5 text-sm"
                        />
                      )}
                    </div>
                    <textarea
                      value={entry.note}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [incident.id]: { ...entry, note: event.target.value.slice(0, 3000) },
                        }))
                      }
                      rows={2}
                      placeholder="Resolution note — what was agreed, and any action taken in Stripe."
                      className="w-full rounded-sm border border-hairline bg-white p-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busyId === incident.id || entry.note.trim().length < 5}
                      onClick={() => resolve(incident)}
                      className="h-9 rounded-sm bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Resolve incident
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
