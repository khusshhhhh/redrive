"use client";

import { useState } from "react";
import { Minus, Plus, ShieldCheck } from "lucide-react";

import Reveal from "./Reveal";

const money = (value: number) => `AU$${Math.round(value).toLocaleString()}`;

export default function PriceEstimator() {
  const [days, setDays] = useState(3);
  const [dailyPrice, setDailyPrice] = useState(110);

  const total = dailyPrice * days;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
            One clear price
          </p>
          <h2 className="mt-3 text-display-3xl font-extrabold tracking-tight text-ink">
            The price you see is the price you pay.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">
            Every listing shows one all-in daily price — no booking fee, no service fee, nothing added at checkout.
            Your card is only charged once a host accepts. Slide the trip length and price to see how it adds up.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted">
            {["No membership or booking fees", "Protection and any deposit are set per listing", "Cancel free any time before a host accepts"].map((item) => (
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-soft">Daily price</p>
              <p className="text-sm font-bold text-ink">{money(dailyPrice)}</p>
            </div>
            <input
              type="range"
              min={45}
              max={450}
              step={5}
              value={dailyPrice}
              onChange={(event) => setDailyPrice(Number(event.target.value))}
              aria-label="Daily price"
              className="mt-3 w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-soft">
              <span>AU$45</span>
              <span>AU$450</span>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-hairline-soft pt-5 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>{money(dailyPrice)} × {days} day{days === 1 ? "" : "s"}</span>
              <span className="text-ink">{money(total)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-hairline-soft pt-3 text-base font-extrabold text-ink">
              <span>Trip total</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-soft">
            Estimate only. Any protection you choose and any host security deposit are shown on each listing before
            you send a request.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
