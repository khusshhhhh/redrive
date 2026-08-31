"use client";

import { Check, Circle } from "lucide-react";

import type { SafeReservation } from "@/app/types";

type StepState = "done" | "current" | "todo";

interface Step {
  key: string;
  label: string;
  state: StepState;
  hint?: string;
}

function relative(target: Date): string {
  const ms = target.getTime() - Date.now();
  const abs = Math.abs(ms);
  const day = 86_400_000;
  const hour = 3_600_000;
  const suffix = ms >= 0 ? "" : " ago";
  const prefix = ms >= 0 ? "in " : "";
  if (abs >= day) return `${prefix}${Math.round(abs / day)} day${Math.round(abs / day) === 1 ? "" : "s"}${suffix}`;
  if (abs >= hour) return `${prefix}${Math.round(abs / hour)} hour${Math.round(abs / hour) === 1 ? "" : "s"}${suffix}`;
  return ms >= 0 ? "soon" : "just now";
}

export default function TripStatusTimeline({ reservation }: { reservation: SafeReservation }) {
  const status = reservation.status;
  if (["DECLINED", "CANCELLED", "EXPIRED"].includes(status)) return null;

  const paid = ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "");
  const start = new Date(reservation.startDate);
  const end = new Date(reservation.endDate);

  const approved = status !== "REVIEWING";
  const active = status === "ACTIVE" || status === "COMPLETED";
  const completed = status === "COMPLETED";

  const steps: Step[] = [
    {
      key: "requested",
      label: "Requested",
      state: "done",
    },
    {
      key: "approved",
      label: reservation.instantBooked ? "Instantly booked" : "Approved by host",
      state: approved ? "done" : "current",
      hint: !approved ? "The host is reviewing your request" : undefined,
    },
    {
      key: "paid",
      label: "Payment held",
      state: paid ? "done" : approved ? "current" : "todo",
      hint:
        !paid && approved && reservation.paymentDueAt
          ? `Pay ${relative(new Date(reservation.paymentDueAt))} or the dates are released`
          : undefined,
    },
    {
      key: "pickup",
      label: "Pickup handover",
      state: active ? "done" : paid ? "current" : "todo",
      hint: !active && paid ? `Pickup ${relative(start)}` : undefined,
    },
    {
      key: "return",
      label: "Return handover",
      state: completed ? "done" : active ? "current" : "todo",
      hint: active && !completed ? `Return ${relative(end)}` : undefined,
    },
    {
      key: "complete",
      label: "Complete · payout released",
      state: completed ? "done" : "todo",
    },
  ];

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Trip status</p>
      <ol className="mt-4 space-y-0">
        {steps.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  step.state === "done"
                    ? "border-primary bg-primary text-white"
                    : step.state === "current"
                      ? "border-primary bg-white text-primary"
                      : "border-hairline bg-white text-hairline"
                }`}
              >
                {step.state === "done" ? <Check size={13} /> : <Circle size={7} className="fill-current" />}
              </span>
              {index < steps.length - 1 && (
                <span className={`w-px flex-1 ${step.state === "done" ? "bg-primary/40" : "bg-hairline"}`} />
              )}
            </div>
            <div className={`pb-5 ${index === steps.length - 1 ? "pb-0" : ""}`}>
              <p
                className={`text-sm ${
                  step.state === "todo" ? "text-muted" : "font-semibold text-ink"
                }`}
              >
                {step.label}
              </p>
              {step.hint && <p className="mt-0.5 text-xs text-muted">{step.hint}</p>}
            </div>
          </li>
        ))}
      </ol>
      <a
        href={`/api/reservations/${reservation.id}/receipt`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-xs font-semibold text-primary hover:text-primary-active"
      >
        View / print receipt →
      </a>
    </section>
  );
}
