"use client";

import StarRating from "@/app/components/inputs/StarRating";

interface RatingSummaryProps {
  average: number;
  total: number;
  /** Count of reviews at each whole-star value, e.g. { 5: 8, 4: 3, ... }. */
  distribution: Record<number, number>;
  className?: string;
}

export default function RatingSummary({ average, total, distribution, className = "" }: RatingSummaryProps) {
  return (
    <div className={`flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8 ${className}`}>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-4xl font-bold tracking-tight text-ink">{average.toFixed(1)}</span>
        <div>
          <StarRating value={average} size={16} label="Average rating" />
          <p className="mt-1 text-[11px] text-muted">
            {total} {total === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2.5 text-xs text-muted">
              <span className="w-3 shrink-0 text-right font-semibold text-ink">{star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-6 shrink-0 tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
