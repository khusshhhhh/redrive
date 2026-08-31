"use client";

import Link from "next/link";

import { categories } from "@/app/components/navbar/Categories";
import type { HomeCategory } from "@/app/actions/getHomeData";
import Reveal from "./Reveal";

export default function CategoryExplorer({ byCategory }: { byCategory: HomeCategory[] }) {
  const countFor = (label: string) => byCategory.find((entry) => entry.label === label);
  const anyLive = byCategory.some((entry) => entry.count > 0);

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Whatever the plan
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          One marketplace, every kind of vehicle.
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category, index) => {
          const entry = countFor(category.label);
          const live = (entry?.count ?? 0) > 0;
          return (
            <Reveal key={category.label} delay={(index % 5) * 50}>
              <Link
                href={`/explore?category=${encodeURIComponent(category.label)}`}
                className={`lift group flex h-full flex-col justify-between rounded-2xl border bg-white p-5 transition ${
                  live ? "border-hairline-soft hover:border-border-strong" : "border-hairline-soft/70"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    live ? "bg-surface-soft text-primary" : "bg-surface-soft/60 text-muted-soft"
                  }`}
                >
                  <category.icon />
                </span>
                <div className="mt-6">
                  <p className="text-[15px] font-bold text-ink">{category.label}</p>
                  {anyLive ? (
                    live ? (
                      <p className="mt-1 text-xs text-muted">
                        {entry!.count} available
                        {entry!.fromPrice ? ` · from AU$${entry!.fromPrice}/day` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-soft">Be the first to list one</p>
                    )
                  ) : (
                    <p className="mt-1 text-xs text-muted">Browse listings</p>
                  )}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
