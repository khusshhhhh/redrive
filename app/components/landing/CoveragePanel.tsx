"use client";

import Link from "next/link";
import { IconMapPin } from "@tabler/icons-react";

import type { HomeStateCoverage } from "@/app/actions/getHomeData";
import Reveal from "./Reveal";

export default function CoveragePanel({ byState }: { byState: HomeStateCoverage[] }) {
  const max = Math.max(1, ...byState.map((entry) => entry.count));
  const liveStates = byState.filter((entry) => entry.count > 0).length;
  const anyLive = liveStates > 0;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          State by state
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          {anyLive
            ? `Live in ${liveStates} of ${byState.length} states and territories — and growing.`
            : "Coming to every state and territory."}
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">
          From inner-city runabouts to outback-ready 4WDs. Pick a state to see what&rsquo;s near you, or be the first to
          list one.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {byState.map((entry, index) => (
          <Reveal key={entry.state} delay={(index % 4) * 50}>
            <Link
              href={`/explore?state=${entry.state}`}
              className="lift group flex h-full flex-col justify-between rounded-2xl border border-hairline-soft bg-white p-5 hover:border-border-strong"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold tracking-tight text-ink">{entry.state}</span>
                <IconMapPin size={16} className="text-muted-soft transition group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs leading-4 text-muted">{entry.label}</p>
              <div className="mt-5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${entry.count ? Math.max(8, (entry.count / max) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-ink">
                  {anyLive
                    ? entry.count
                      ? `${entry.count} vehicle${entry.count === 1 ? "" : "s"}`
                      : "None yet — list yours"
                    : "Browse"}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
