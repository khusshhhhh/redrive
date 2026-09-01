"use client";

import Link from "next/link";
import { IconMapPin } from "@tabler/icons-react";

import { AU_STATE_LIST } from "@/app/libs/marketplace";
import Reveal from "./Reveal";

export default function CoveragePanel() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          State by state
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          Every state and territory.
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">
          From inner-city runabouts to outback-ready 4WDs. Pick a state to see what&rsquo;s near you, or list one of your
          own.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AU_STATE_LIST.map((entry, index) => (
          <Reveal key={entry.value} delay={(index % 4) * 50}>
            <Link
              href={`/explore?state=${entry.value}`}
              className="lift group flex h-full flex-col justify-between rounded-2xl border border-hairline-soft bg-white p-5 hover:border-border-strong"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold tracking-tight text-ink">{entry.value}</span>
                <IconMapPin size={16} className="text-muted-soft transition group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs leading-4 text-muted">{entry.label}</p>
              <p className="mt-5 text-xs font-semibold text-ink">Browse vehicles →</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
