"use client";

import { useState } from "react";
import { Minus, Plus, ShieldCheck } from "lucide-react";

import { tripPriceBreakdown } from "@/app/libs/pricing";
import Reveal from "./Reveal";

const money = (value: number) => `AU$${Math.round(value).toLocaleString()}`;

export default function PriceEstimator() {
  const [days, setDays] = useState(3);
  const [rate, setRate] = useState(95);

  const b = tripPriceBreakdown(rate, days);

  const rows = [
    { label: `${money(rate)} × ${days} day${days === 1 ? "" : "s"}`, value: money(b.base) },
    { label: "Redrive fee", value: money(b.redriveFee) },
    { label: "Service fee", value: money(b.serviceFee) },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
            No surprises
          </p>
          <h2 className="mt-3 text-display-3xl font-extrabold tracking-tight text-ink">
            See the whole price before you ask.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">
            The host sets the daily rate. Redrive adds a percentage fee and a flat service fee — both shown in full up
            front. Your card is only charged once a host accepts. Adjust the trip length and rate to see how it works.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted">
            {["No membership or booking fees", "Insurance and any deposit are set per listing", "Cancel free any time before a host accepts"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <ShieldCheck size={11} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={80} className="rounded-2xl border border-hairline-soft bg-white p-6 shadow-[0_20px_60px_-30px_rgba(59,59,59,0.4)] sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-soft">Trip length</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">
                {days} <span className="text-base font-semibold text-muted">day{days === 1 ? "" : "s"}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                aria-label="Fewer days"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink transition hover:border-ink"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDays((d) => Math.min(30, d + 1))}
                aria-label="More days"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink transition hover:border-ink"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-soft">Daily rate</p>
              <p className="text-sm font-bold text-ink">{money(rate)}</p>
            </div>
            <input
              type="range"
              min={40}
              max={400}
              step={5}
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
              aria-label="Daily rate"
              className="mt-3 w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-soft">
              <span>AU$40</span>
              <span>AU$400</span>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-hairline-soft pt-5 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-muted">
                <span>{row.label}</span>
                <span className="text-ink">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-hairline-soft pt-3 text-base font-extrabold text-ink">
              <span>Estimated total</span>
              <span>{money(b.total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-soft">
            Estimate only. The real breakdown, including any insurance and security deposit, is shown on each listing
            before you send a request.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
