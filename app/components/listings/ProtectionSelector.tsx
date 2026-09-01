"use client";

import { Check, ShieldCheck } from "lucide-react";

export interface ProtectionTier {
  value: string;
  label: string;
  tagline: string;
  perDay: number;
  excess: number | null;
  points: string[];
}

export const PROTECTION_TIERS: ProtectionTier[] = [
  {
    value: "Happy Driver",
    label: "Happy Driver",
    tagline: "Most protection",
    perDay: 40,
    excess: 500,
    points: ["Damage and third-party liability covered", "Excess capped at AU$500", "Best for longer or interstate trips"],
  },
  {
    value: "Risk Taker",
    label: "Risk Taker",
    tagline: "Balanced",
    perDay: 20,
    excess: 4000,
    points: ["Minor damage covered", "Excess up to AU$4,000", "Good for short, local trips"],
  },
  {
    value: "No Insurance",
    label: "No cover",
    tagline: "You carry the risk",
    perDay: 0,
    excess: null,
    points: ["You pay for any damage in full", "No daily protection fee", "Only if you have your own cover"],
  },
];

const money = (value: number) => `AU$${value.toLocaleString("en-AU")}`;

/**
 * The guest's damage-protection choice, shown as comparable cards. The line
 * underneath ties the excess to the held security deposit so the guest sees the
 * real worst case before booking.
 */
export default function ProtectionSelector({
  value,
  dayCount,
  securityDeposit,
  onChange,
}: {
  value: string;
  dayCount: number;
  securityDeposit?: number | null;
  onChange: (tier: ProtectionTier) => void;
}) {
  const selected = PROTECTION_TIERS.find((tier) => tier.value === value) || PROTECTION_TIERS[1];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-semibold text-ink">
        <ShieldCheck size={17} className="text-primary" /> Damage protection
      </div>

      <div className="space-y-2">
        {PROTECTION_TIERS.map((tier) => {
          const active = tier.value === value;
          return (
            <button
              key={tier.value}
              type="button"
              onClick={() => onChange(tier)}
              aria-pressed={active}
              className={`flex w-full gap-3 rounded-md border p-3 text-left transition ${
                active
                  ? "border-ink bg-surface-soft ring-1 ring-ink"
                  : "border-hairline hover:border-border-strong"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active ? "border-ink bg-ink text-white" : "border-hairline"
                }`}
              >
                {active && <Check size={11} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-sm font-semibold text-ink">{tier.label}</span>
                  <span className="text-sm font-semibold text-ink">
                    {tier.perDay === 0 ? "No fee" : `${money(tier.perDay)}/day`}
                  </span>
                </span>
                <span className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {tier.tagline}
                  </span>
                  {tier.perDay > 0 && (
                    <span className="text-[11px] text-muted">
                      {money(tier.perDay * Math.max(1, dayCount))} this trip
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block text-[11px] leading-4 text-muted">
                  {tier.excess != null
                    ? `${tier.points[0]} · excess ${money(tier.excess)}`
                    : tier.points[0]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        {selected.excess != null ? (
          <>
            Your excess — the most you&rsquo;d pay for damage under this option — is{" "}
            <span className="font-semibold text-ink">{money(selected.excess)}</span>.
          </>
        ) : (
          <>
            With no cover you&rsquo;re responsible for the full repair cost of any damage.
          </>
        )}
        {securityDeposit
          ? ` The host also holds a refundable ${money(securityDeposit)} security deposit against the excess — it's never charged unless there's a claim.`
          : ""}
      </p>
    </div>
  );
}
