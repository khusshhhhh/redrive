'use client';

import { IconAward, IconStarFilled } from "@tabler/icons-react";
import StarRating from "@/app/components/inputs/StarRating";

interface RatingDisplayProps {
    rating: number;
    reviewCount: number;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({ rating, reviewCount }) => {
    if (reviewCount === 0) {
        return null;
    }

    const ratingLabel = rating >= 4.8
        ? "Exceptional guest experience"
        : rating >= 4.5
            ? "Outstanding guest experience"
            : rating >= 4
                ? "Great guest experience"
                : "Recommended by guests";

    return (
        <section
            aria-label={`${rating.toFixed(2)} out of 5 from ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
            className="relative overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-br from-white via-white to-accent-soft/60 px-5 py-6 shadow-[0_16px_40px_rgba(22, 22, 22,0.08)] sm:px-7"
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-active to-primary" aria-hidden="true" />
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full border-[28px] border-accent/10" aria-hidden="true" />
            <div className="absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-surface-strong/60 blur-2xl" aria-hidden="true" />

            <div className="relative flex flex-col items-center justify-between gap-6 sm:flex-row sm:gap-8">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
                    <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-white bg-ink text-white shadow-[0_10px_24px_rgba(22, 22, 22,0.22)]">
                        <span className="text-[32px] font-bold leading-none tracking-[-0.04em]">{rating.toFixed(2)}</span>
                        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">out of 5</span>
                        <span className="absolute -right-1 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent text-ink shadow-sm" aria-hidden="true">
                            <IconStarFilled size={16} />
                        </span>
                    </div>

                    <div className="text-center sm:text-left">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-ink">
                            <IconAward size={15} className="text-accent-active" aria-hidden="true" />
                            Guest favourite
                        </span>
                        <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink sm:text-xl">{ratingLabel}</h2>
                        <p className="mt-1 text-sm text-muted">
                            Based on {reviewCount} guest {reviewCount === 1 ? "review" : "reviews"}
                        </p>
                    </div>
                </div>

                <div className="flex w-full flex-col items-center border-t border-hairline-soft pt-5 sm:w-auto sm:min-w-36 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
                    <StarRating value={rating} size={18} label="Guest rating" />
                    <span className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Guest rating</span>
                </div>
            </div>
        </section>
    );
};

export default RatingDisplay;
