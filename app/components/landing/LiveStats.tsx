"use client";

import CountUp from "./CountUp";
import type { HomeStats } from "@/app/actions/getHomeData";

function responseLabel(hours: number | null): { value: number; suffix: string } {
  if (hours === null) return { value: 0, suffix: "—" };
  if (hours < 1) return { value: 1, suffix: "h" };
  if (hours < 24) return { value: Math.round(hours), suffix: "h" };
  return { value: Math.round(hours / 24), suffix: "d" };
}

export default function LiveStats({ stats }: { stats: HomeStats }) {
  const reply = responseLabel(stats.medianResponseHours);
  const hasLive = stats.liveCount > 0;

  const cells = hasLive
    ? [
        { node: <CountUp value={stats.liveCount} />, label: "Vehicles listed now" },
        { node: <CountUp value={stats.stateCount} />, label: "States & territories" },
        { node: <CountUp value={stats.categoryCount} />, label: "Vehicle categories live" },
        {
          node:
            stats.medianResponseHours === null ? (
              <>New</>
            ) : (
              <CountUp value={reply.value} suffix={reply.suffix} />
            ),
          label: "Typical host reply",
        },
        { node: <CountUp value={stats.verifiedSharePct} suffix="%" />, label: "Hosts ID-verified" },
      ]
    : [
        { node: <>10</>, label: "Vehicle categories" },
        { node: <>8</>, label: "States & territories" },
        { node: <>AU$0</>, label: "Cost to list your vehicle" },
        { node: <>0</>, label: "Membership or booking fees" },
      ];

  return (
    <section className="border-y border-hairline-soft bg-surface-soft/60">
      <div className="mx-auto max-w-6xl px-5 py-2 sm:px-8">
        <div className={`grid gap-px overflow-hidden ${cells.length === 5 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
          {cells.map((cell) => (
            <div key={cell.label} className="px-2 py-8 text-center">
              <p className="text-display-2xl font-extrabold tracking-tight text-ink">{cell.node}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">{cell.label}</p>
            </div>
          ))}
        </div>
        {hasLive && (
          <p className="pb-6 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-soft">
            Updated continuously from live listings
          </p>
        )}
      </div>
    </section>
  );
}
