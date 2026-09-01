"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import toast from "@/app/libs/toast";

interface Incident {
  id: string;
  type: string;
  status: string;
  summary: string;
  reporterUserId: string;
  responderUserId: string | null;
  responderStatement: string | null;
  respondedAt: string | null;
  resolution: string | null;
  resolutionOutcome: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  ESCALATED: "With Redrive support",
};

export default function IncidentThread({
  reservationId,
  currentUserId,
  onChanged,
}: {
  reservationId: string;
  currentUserId: string;
  onChanged?: () => void;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statement, setStatement] = useState<Record<string, string>>({});
  const [resolution, setResolution] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    axios
      .get<Incident[]>(`/api/reservations/${reservationId}/incidents`)
      .then((response) => setIncidents(response.data))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [reservationId]);

  useEffect(load, [load]);

  const act = async (incidentId: string, payload: Record<string, unknown>) => {
    setBusyId(incidentId);
    try {
      await axios.patch(`/api/reservations/${reservationId}/incidents/${incidentId}`, payload);
      toast.success("Updated");
      setStatement((current) => ({ ...current, [incidentId]: "" }));
      setResolution((current) => ({ ...current, [incidentId]: "" }));
      load();
      onChanged?.();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not update the case"
          : "Could not update the case",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded || incidents.length === 0) return null;

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50/50 p-5 sm:p-7">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <AlertTriangle size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Reported issues</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            The payout is held until every open issue is resolved. Anything involving money is
            handled by Redrive support.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {incidents.map((incident) => {
          const isReporter = incident.reporterUserId === currentUserId;
          const canRespond =
            !isReporter && !incident.responderStatement && incident.status !== "RESOLVED";
          const open = incident.status === "OPEN" || incident.status === "UNDER_REVIEW";

          return (
            <div key={incident.id} className="rounded-md border border-hairline-soft bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {incident.type.replace(/_/g, " ")}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    incident.status === "RESOLVED"
                      ? "bg-emerald-50 text-emerald-700"
                      : incident.status === "ESCALATED"
                        ? "bg-surface-strong text-ink"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {incident.status === "RESOLVED" && <CheckCircle2 size={13} />}
                  {STATUS_LABEL[incident.status] ?? incident.status}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-body">
                <span className="font-semibold text-ink">{isReporter ? "You" : "Other party"} reported:</span>{" "}
                {incident.summary}
              </p>

              {incident.responderStatement && (
                <p className="mt-2 rounded-sm bg-surface-soft p-2.5 text-sm leading-6 text-body">
                  <span className="font-semibold text-ink">Response:</span> {incident.responderStatement}
                </p>
              )}

              {incident.resolution && (
                <p className="mt-2 rounded-sm border border-emerald-200 bg-emerald-50 p-2.5 text-sm leading-6 text-body">
                  <span className="font-semibold text-ink">Resolution</span>
                  {incident.resolutionOutcome ? ` (${incident.resolutionOutcome.replace(/_/g, " ").toLowerCase()})` : ""}: {incident.resolution}
                </p>
              )}

              {canRespond && (
                <div className="mt-3">
                  <textarea
                    value={statement[incident.id] ?? ""}
                    onChange={(event) =>
                      setStatement((current) => ({ ...current, [incident.id]: event.target.value.slice(0, 3000) }))
                    }
                    rows={2}
                    placeholder="Add your account of what happened."
                    className="w-full rounded-sm border border-hairline bg-white p-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busyId === incident.id || (statement[incident.id] ?? "").trim().length < 10}
                    onClick={() => act(incident.id, { action: "RESPOND", statement: statement[incident.id] })}
                    className="mt-2 h-9 rounded-sm bg-accent px-3 text-xs font-semibold text-ink disabled:opacity-50"
                  >
                    Submit response
                  </button>
                </div>
              )}

              {open && (
                <div className="mt-3 border-t border-hairline-soft pt-3">
                  <p className="text-xs text-muted">
                    If you and the other party agree there is nothing owed, either of you can close this:
                  </p>
                  <textarea
                    value={resolution[incident.id] ?? ""}
                    onChange={(event) =>
                      setResolution((current) => ({ ...current, [incident.id]: event.target.value.slice(0, 3000) }))
                    }
                    rows={2}
                    placeholder="e.g. Minor scuff, agreed no charge."
                    className="mt-2 w-full rounded-sm border border-hairline bg-white p-2 text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === incident.id || (resolution[incident.id] ?? "").trim().length < 5}
                      onClick={() =>
                        act(incident.id, {
                          action: "RESOLVE",
                          outcome: "NO_ACTION",
                          resolution: resolution[incident.id],
                        })
                      }
                      className="h-9 rounded-sm bg-accent px-3 text-xs font-semibold text-ink disabled:opacity-50"
                    >
                      Close — nothing owed
                    </button>
                    <button
                      type="button"
                      disabled={busyId === incident.id}
                      onClick={() =>
                        act(incident.id, {
                          action: "ESCALATE",
                          resolution:
                            (resolution[incident.id] ?? "").trim() || "Parties could not agree — escalating to Redrive.",
                        })
                      }
                      className="h-9 rounded-sm border border-hairline px-3 text-xs font-semibold text-muted"
                    >
                      Ask Redrive to step in
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
