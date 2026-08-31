"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import type { ListingCardData } from "@/app/libs/listingCardData";
import ListingCard from "@/app/components/listings/ListingCard";
import { FALLBACK_CARDS } from "./fallbackCards";
import Reveal from "./Reveal";

export default function LiveListingsRail({
  cards,
  liveCount,
}: {
  cards: ListingCardData[];
  liveCount: number;
}) {
  const seen = new Set(cards.map((card) => card.id));
  const rail = cards.length >= 4 ? cards.slice(0, 12) : [...cards, ...FALLBACK_CARDS.filter((card) => !seen.has(card.id))].slice(0, 12);

  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const nudge = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const step = el.querySelector<HTMLElement>("[data-rail-item]")?.offsetWidth ?? 260;
    el.scrollBy({ left: direction * (step + 16) * 2, behavior: "smooth" });
  };

  return (
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {liveCount > 0 ? `${liveCount} live right now` : "Fresh on Redrive"}
            </p>
            <h2 className="mt-3 text-display-2xl font-extrabold tracking-tight text-ink">
              Available across Australia right now.
            </h2>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={atStart}
              aria-label="Scroll listings left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition hover:border-ink disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={atEnd}
              aria-label="Scroll listings right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition hover:border-ink disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </Reveal>
      </div>

      <div className="marquee-mask mt-8">
        <div
          ref={scroller}
          onScroll={sync}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {rail.map((card) => (
            <div key={card.id} data-rail-item className="w-[230px] shrink-0 snap-start sm:w-[250px]">
              <ListingCard data={card} currentUser={null} compact />
            </div>
          ))}
          <Link
            href="/explore"
            className="group flex w-[230px] shrink-0 snap-start flex-col items-start justify-center gap-3 rounded-md border border-dashed border-border-strong p-6 text-ink transition hover:bg-surface-soft sm:w-[250px]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-primary transition group-hover:bg-white">
              <ArrowRight size={20} />
            </span>
            <span className="text-sm font-semibold">Browse every vehicle</span>
            <span className="text-xs text-muted">Filter by suburb, dates and price</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
