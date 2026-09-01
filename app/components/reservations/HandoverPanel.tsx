/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Camera,
  Check,
  ClipboardCheck,
  Fuel,
  Gauge,
  ShieldAlert,
  Upload,
} from "lucide-react";
import toast from "@/app/libs/toast";

import type { SafeReservation } from "@/app/types";

type Media = {
  id?: string;
  url: string;
  publicId: string;
  category: string;
  previewUrl?: string;
};
type Report = {
  id: string;
  phase: "PICKUP" | "RETURN";
  submittedById: string;
  odometer: number | null;
  fuelOrChargeLevel: number | null;
  checklist: Record<string, boolean>;
  notes: string | null;
  acknowledgedByIds: string[];
  status: string;
  media: Media[];
};
const checklistItems = [
  ["exterior", "Exterior condition reviewed"],
  ["interior", "Interior condition reviewed"],
  ["keys", "Keys and accessories confirmed"],
  ["fuel", "Fuel or charge level confirmed"],
] as const;

export default function HandoverPanel({
  reservation,
  currentUserId,
  onChanged,
}: {
  reservation: SafeReservation;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [phase, setPhase] = useState<"PICKUP" | "RETURN">("PICKUP");
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [media, setMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [incidentSummary, setIncidentSummary] = useState("");
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemType, setProblemType] = useState("DAMAGE");
  const [problemText, setProblemText] = useState("");
  const [problemBusy, setProblemBusy] = useState(false);

  const load = () =>
    axios
      .get<Report[]>(`/api/reservations/${reservation.id}/handover`)
      .then((response) => setReports(response.data));
  useEffect(() => {
    if (["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || ""))
      void load();
  }, [reservation.id, reservation.paymentStatus]);
  const report = reports.find((item) => item.phase === phase);
  const opensAt = new Date(
    phase === "PICKUP" ? reservation.startDate : reservation.endDate,
  );
  const available =
    Date.now() >= opensAt.getTime() &&
    (phase === "PICKUP"
      ? ["APPROVED", "ACTIVE"].includes(reservation.status)
      : ["ACTIVE", "COMPLETED"].includes(reservation.status));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (media.length + files.length > 12)
      return toast.error("You can add up to 12 photos");
    setBusy(true);
    try {
      const uploaded: Media[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("image", file);
        form.append("folder", "handovers");
        const response = await axios.post<{
          url: string;
          publicId: string;
          previewUrl?: string;
        }>("/api/upload", form);
        uploaded.push({ ...response.data, category: "CONDITION" });
      }
      setMedia((current) => [...current, ...uploaded]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!checklistItems.every(([key]) => checklist[key]))
      return toast.error("Confirm every checklist item");
    setBusy(true);
    try {
      await axios.put(`/api/reservations/${reservation.id}/handover`, {
        phase,
        action: "SUBMIT",
        odometer,
        fuelOrChargeLevel: fuel,
        notes,
        checklist,
        media,
      });
      toast.success(
        `${phase === "PICKUP" ? "Pickup" : "Return"} report sent for agreement`,
      );
      setMedia([]);
      setNotes("");
      setOdometer("");
      setFuel("");
      setChecklist({});
      await load();
      onChanged();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Handover could not be submitted",
      );
    } finally {
      setBusy(false);
    }
  };

  const acknowledge = async () => {
    setBusy(true);
    try {
      const response = await axios.put(
        `/api/reservations/${reservation.id}/handover`,
        { phase, action: "ACKNOWLEDGE" },
      );
      if (response.data.release?.released)
        toast.success("Return agreed and owner payout released");
      else
        toast.success(
          `${phase === "PICKUP" ? "Pickup" : "Return"} handover agreed`,
        );
      await load();
      onChanged();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Agreement could not be recorded",
      );
    } finally {
      setBusy(false);
    }
  };

  const isHost = reservation.listing.userId === currentUserId;
  const tripStarted = new Date(reservation.startDate).getTime() <= Date.now();
  const returnOverdue =
    new Date(reservation.endDate).getTime() < Date.now() && reservation.status !== "COMPLETED";

  const submitProblem = async () => {
    if (problemText.trim().length < 10) {
      return toast.error("Describe the problem in at least 10 characters");
    }
    setProblemBusy(true);
    try {
      await axios.post(`/api/reservations/${reservation.id}/incidents`, {
        type: problemType,
        summary: problemText.trim(),
      });
      toast.success("Reported. The other party has been notified and the payout is held for review.");
      setProblemText("");
      setProblemOpen(false);
      onChanged();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Could not report the problem"
          : "Could not report the problem",
      );
    } finally {
      setProblemBusy(false);
    }
  };

  const reportIncident = async () => {
    if (incidentSummary.trim().length < 10)
      return toast.error("Describe the issue in at least 10 characters");
    setBusy(true);
    try {
      await axios.post(`/api/reservations/${reservation.id}/incidents`, {
        type: `HANDOVER_${phase}`,
        summary: incidentSummary,
      });
      toast.success("Issue reported. Payout release is paused for review.");
      setIncidentSummary("");
      setShowIncident(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Issue could not be reported");
    } finally {
      setBusy(false);
    }
  };

  if (!["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || ""))
    return null;
  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <ClipboardCheck size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Digital handover</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Condition evidence and agreement are recorded for both parties.
          </p>
        </div>
      </div>
      <VehicleHandoverNotes listing={reservation.listing} />
      <div className="mt-6 grid grid-cols-2 rounded-sm bg-surface-soft p-1">
        {(["PICKUP", "RETURN"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setPhase(item)}
            className={`h-10 rounded-sm text-xs font-semibold ${phase === item ? "bg-white text-ink shadow-sm" : "text-muted"}`}
          >
            {item === "PICKUP" ? "Pickup" : "Return"}
          </button>
        ))}
      </div>
      {report && report.status !== "DRAFT" ? (
        <div className="mt-6 space-y-5">
          <div
            className={`rounded-sm p-4 text-sm ${report.status === "AGREED" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}
          >
            <strong>
              {report.status === "AGREED"
                ? "Agreed by both parties"
                : "Waiting for the other party"}
            </strong>
            <p className="mt-1 text-xs leading-5">
              Submitted readings and photos are locked to preserve the handover
              record.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Reading
              icon={<Gauge size={17} />}
              label="Odometer"
              value={
                report.odometer == null
                  ? "Not recorded"
                  : `${report.odometer.toLocaleString()} km`
              }
            />
            <Reading
              icon={<Fuel size={17} />}
              label="Fuel / charge"
              value={
                report.fuelOrChargeLevel == null
                  ? "Not recorded"
                  : `${report.fuelOrChargeLevel}%`
              }
            />
          </div>
          {report.notes && (
            <div className="rounded-sm border border-hairline-soft p-4">
              <p className="text-xs font-semibold text-ink">Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {report.notes}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {report.media.map((item) => (
              <img
                key={item.id || item.publicId}
                src={item.url}
                alt={`${item.category || "Vehicle condition"} evidence from this handover`}
                className="aspect-square w-full rounded-sm object-cover"
              />
            ))}
          </div>
          {report.status !== "AGREED" &&
            !report.acknowledgedByIds.includes(currentUserId) && (
              <button
                disabled={busy}
                onClick={() => void acknowledge()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent text-sm font-semibold text-ink hover:bg-accent-active hover:text-white disabled:opacity-50"
              >
                <Check size={17} /> I agree with this record
              </button>
            )}
          {report.status !== "AGREED" &&
            report.acknowledgedByIds.includes(currentUserId) && (
              <p className="text-center text-xs text-muted">
                Your agreement is recorded. Waiting for the other party.
              </p>
            )}
          <p className="flex gap-2 text-xs leading-5 text-muted">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            Do not agree if the record is inaccurate. Use Messages and report an
            incident before payout release.
          </p>
          {reservation.paymentStatus === "PAID_HELD" && (
            <>
              <button
                type="button"
                onClick={() => setShowIncident((current) => !current)}
                className="text-xs font-semibold text-error underline underline-offset-4"
              >
                {showIncident
                  ? "Cancel issue report"
                  : "Report a handover issue"}
              </button>
              {showIncident && (
                <div className="rounded-sm border border-red-200 bg-red-50 p-4">
                  <label className="text-xs font-semibold text-red-950">
                    What is inaccurate or damaged?
                    <textarea
                      value={incidentSummary}
                      onChange={(event) =>
                        setIncidentSummary(event.target.value)
                      }
                      maxLength={3000}
                      rows={4}
                      className="mt-2 w-full rounded-sm border border-red-200 bg-white p-3 text-sm font-normal leading-6 text-ink outline-none focus:border-error"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reportIncident()}
                    className="mt-3 h-10 rounded-sm bg-error px-4 text-xs font-semibold text-ink disabled:opacity-50"
                  >
                    Submit issue and pause payout
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : !available ? (
        <div className="mt-6 rounded-sm bg-surface-soft p-5 text-sm text-muted">
          {phase === "PICKUP" ? "Pickup" : "Return"} handover opens on{" "}
          {opensAt.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink">
              Odometer (km)
              <input
                type="number"
                min="0"
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
                className="mt-2 h-12 w-full rounded-sm border border-hairline px-4 text-sm font-normal outline-none focus:border-ink"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Fuel or charge (%)
              <input
                type="number"
                min="0"
                max="100"
                value={fuel}
                onChange={(event) => setFuel(event.target.value)}
                className="mt-2 h-12 w-full rounded-sm border border-hairline px-4 text-sm font-normal outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {checklistItems.map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-hairline-soft p-4 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checklist[key])}
                  onChange={(event) =>
                    setChecklist((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          <label className="block text-xs font-semibold text-ink">
            Condition notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Record existing marks, damage, accessories and anything both parties should know."
              className="mt-2 w-full rounded-sm border border-hairline p-4 text-sm font-normal leading-6 outline-none focus:border-ink"
            />
          </label>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink">Condition photos</p>
              <span className="text-xs text-muted">
                {media.length}/12 · minimum 4
              </span>
            </div>
            <label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-hairline bg-surface-soft px-4 text-center hover:border-primary">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => void upload(event.target.files)}
              />
              <Camera size={22} className="text-primary" />
              <span className="mt-2 text-xs font-semibold text-ink">
                Add walk-around photos
              </span>
              <span className="mt-1 text-[11px] text-muted">
                Front, rear, both sides and any existing marks
              </span>
            </label>
            {media.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {media.map((item, index) => (
                  <button
                    type="button"
                    title="Remove photo"
                    key={item.publicId}
                    onClick={() =>
                      setMedia((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <img
                      src={item.previewUrl || item.url}
                      alt={`New handover evidence photo ${index + 1}`}
                      className="aspect-square w-full rounded-sm object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent text-sm font-semibold text-ink hover:bg-accent-active hover:text-white disabled:opacity-50"
          >
            <Upload size={17} />
            {busy ? "Saving evidence…" : "Submit for both parties to agree"}
          </button>
        </div>
      )}

      {tripStarted && ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "") && (
        <div className="mt-6 border-t border-hairline-soft pt-5">
          {isHost && returnOverdue && (
            <p className="mb-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              This trip&rsquo;s return time has passed.
              {reservation.listing.lateReturnFeePerHour
                ? ` Your listing lists a late fee of AU$${reservation.listing.lateReturnFeePerHour}/hour — report it below to start a record.`
                : " Report a late return below to start a record."}
            </p>
          )}
          {problemOpen ? (
            <div className="rounded-sm border border-hairline-soft p-4">
              <label className="text-xs font-semibold text-ink">
                What&rsquo;s the problem?
                <select
                  value={problemType}
                  onChange={(event) => setProblemType(event.target.value)}
                  className="mt-2 h-10 w-full rounded-sm border border-hairline bg-white px-2 text-sm font-normal"
                >
                  <option value="DAMAGE">Damage</option>
                  <option value="CLEANLINESS">Cleanliness</option>
                  <option value="LATE_RETURN">Late return</option>
                  <option value="FUEL_OR_CHARGE">Returned low on fuel / charge</option>
                  <option value="RULES_BREACH">Trip rules not followed</option>
                  <option value="OTHER">Something else</option>
                </select>
              </label>
              <textarea
                value={problemText}
                onChange={(event) => setProblemText(event.target.value.slice(0, 3000))}
                rows={3}
                placeholder="What happened, and when. Handover photos are attached automatically."
                className="mt-3 w-full rounded-sm border border-hairline bg-white p-3 text-sm leading-6 outline-none focus:border-ink"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={problemBusy || problemText.trim().length < 10}
                  onClick={() => void submitProblem()}
                  className="h-10 rounded-sm bg-error px-4 text-xs font-semibold text-ink disabled:opacity-50"
                >
                  {problemBusy ? "Reporting…" : "Report problem · hold payout"}
                </button>
                <button
                  type="button"
                  onClick={() => setProblemOpen(false)}
                  className="h-10 rounded-sm border border-hairline px-4 text-xs font-semibold text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setProblemOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-error underline underline-offset-4"
            >
              <ShieldAlert size={14} /> Report a problem with this trip
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// Category-relevant reminders pulled from the listing's specs, so both parties
// check the right things at handover (misfuel, clearance, tolls, self-contained
// certificate, key count, …).
function VehicleHandoverNotes({ listing }: { listing: SafeReservation["listing"] }) {
  const notes: string[] = [];
  const fuel = (listing.fuelType || "").toLowerCase();
  if (fuel.includes("diesel")) notes.push("Diesel — do not misfuel. Check for an AdBlue filler.");
  if (fuel.includes("electric") || listing.chargePortType)
    notes.push(`Electric — confirm charge level and that the charging cable${listing.portableChargerIncluded ? " and portable charger" : ""} is in the vehicle.`);
  if (listing.keysProvided && listing.keysProvided > 1)
    notes.push(`${listing.keysProvided} keys / fobs provided — count them both ways.`);
  if (listing.vehicleHeightMeters)
    notes.push(`Vehicle height ${listing.vehicleHeightMeters} m — mind car parks and low clearances.`);
  if (listing.hasTollTag || listing.tollHandling)
    notes.push(
      listing.tollHandling === "TAG_INCLUDED" || listing.hasTollTag
        ? "Toll tag is fitted — leave it in the vehicle."
        : "No toll tag — tolls are billed back to the guest.",
    );
  if (listing.selfContained && listing.selfContainedCertNumber)
    notes.push(`Self-contained certificate #${listing.selfContainedCertNumber} — keep it with the vehicle.`);
  if (listing.spareTyre === false) notes.push("No spare tyre — note the tyre-repair kit location.");
  if (listing.dailyKmAllowance)
    notes.push(`${listing.dailyKmAllowance.toLocaleString()} km/day included${listing.excessKmFee ? `, then AU$${listing.excessKmFee}/km` : ""} — record the odometer carefully.`);

  if (notes.length === 0) return null;
  return (
    <div className="mt-5 rounded-sm border border-hairline-soft bg-surface-soft p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Check for this vehicle
      </p>
      <ul className="mt-2 space-y-1.5">
        {notes.map((note) => (
          <li key={note} className="flex gap-2 text-xs leading-5 text-body">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Reading({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-sm bg-surface-soft p-4">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}
