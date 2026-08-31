"use client";

import { IconQuote, IconRosetteDiscountCheck, IconStar } from "@tabler/icons-react";

import type { HomeReview } from "@/app/actions/getHomeData";
import Reveal from "./Reveal";

export default function GuestVoices({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length < 3) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <Reveal>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
          From real trips
        </p>
        <h2 className="mt-3 max-w-2xl text-display-3xl font-extrabold tracking-tight text-ink">
          What guests say after handing the keys back.
        </h2>
        <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted">
          A selection of recent reviews. Every one is left by a guest after a completed trip.
        </p>
      </Reveal>

      <div className="mt-12 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review, index) => (
          <Reveal
            key={review.id}
            delay={(index % 3) * 70}
            className="flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-hairline-soft bg-white p-6 sm:w-auto"
          >
            <div className="flex items-center gap-1 text-ink">
              {Array.from({ length: 5 }).map((_, star) => (
                <IconStar
                  key={star}
                  size={15}
                  className={star < review.rating ? "fill-accent text-accent" : "text-hairline"}
                />
              ))}
            </div>
            <IconQuote size={22} className="mt-4 text-hairline" />
            <p className="mt-2 line-clamp-5 flex-1 text-sm leading-6 text-body">{review.text}</p>
            <p className="mt-4 text-xs font-semibold text-muted">
              on {review.vehicle} · {review.suburb}, {review.state}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
              <IconRosetteDiscountCheck size={13} /> Verified trip review
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
