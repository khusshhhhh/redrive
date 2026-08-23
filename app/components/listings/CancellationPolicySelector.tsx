"use client";

import { Check, Clock3, ShieldCheck } from "lucide-react";

import { CANCELLATION_POLICIES, cancellationExample, normalizeCancellationPolicy, type CancellationPolicyKey } from "@/app/libs/cancellationPolicy";

type CancellationPolicySelectorProps = {
  value: string;
  onChange: (value: CancellationPolicyKey) => void;
  disabled?: boolean;
};

export default function CancellationPolicySelector({ value, onChange, disabled }: CancellationPolicySelectorProps) {
  const selected = normalizeCancellationPolicy(value);

  return (
    <div className="grid gap-3">
      {CANCELLATION_POLICIES.map((policy) => {
        const active = selected === policy.key;
        return (
          <button
            key={policy.key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(policy.key)}
            className={`group relative rounded-xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-primary bg-primary/[0.055] shadow-[0_10px_30px_rgba(8,121,133,0.08)]" : "border-hairline-soft bg-white hover:border-primary/45 hover:bg-surface-soft/45"}`}
          >
            <div className="flex items-start gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${active ? "bg-primary text-white" : "bg-surface-strong text-primary"}`}>
                {active ? <Check size={19} strokeWidth={3} /> : policy.key === "FIRM" ? <ShieldCheck size={19} /> : <Clock3 size={19} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-ink">{policy.name}</span>
                  {policy.key === "MODERATE" && <span className="rounded-full border border-accent/35 bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-active">Recommended</span>}
                </span>
                <span className="mt-1 block text-xs text-muted">{policy.shortDescription}</span>
                <span className="mt-3 block text-sm font-medium leading-6 text-body">{policy.guestSummary}</span>
                <span className="mt-2 block text-xs leading-5 text-muted">{cancellationExample(policy.key)}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
