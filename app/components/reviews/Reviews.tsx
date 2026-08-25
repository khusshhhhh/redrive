"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import Avatar from "../Avatar";
import { IconChevronDown, IconStarFilled, IconUserCheck } from "@tabler/icons-react";

interface Review {
    id: string;
    user: {
        image: string | null | undefined;
        name: string;
    };
    rating: number;
    text: string;
    createdAt: string;
}

const ReviewCard = ({ review }: { review: Review }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = review.text.length > 180;
    const filledStars = Math.round(review.rating);

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white p-5 shadow-[0_10px_30px_rgba(24,54,58,0.07)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_36px_rgba(24,54,58,0.11)] motion-reduce:transform-none motion-reduce:transition-none sm:p-6">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden="true" />
            <span className="pointer-events-none absolute bottom-1 right-5 font-serif text-8xl leading-none text-surface-strong/70" aria-hidden="true">&ldquo;</span>

            <header className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-full ring-2 ring-surface-strong ring-offset-2 ring-offset-white">
                        <Avatar src={review.user.image} size={44} alt={`${review.user.name || "Redrive member"} profile photo`} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{review.user.name || "Redrive guest"}</p>
                        <time dateTime={review.createdAt} className="mt-0.5 block text-xs text-muted">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </time>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-full border border-accent/35 bg-accent-soft px-2.5 py-1 text-xs font-bold text-ink" aria-label={`${review.rating} out of 5 stars`}>
                    <IconStarFilled size={14} className="text-accent" aria-hidden="true" />
                    {review.rating.toFixed(1)}
                </div>
            </header>

            <div className="relative mt-5 flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                    <IconStarFilled
                        key={index}
                        size={15}
                        className={index < filledStars ? "text-accent" : "text-hairline"}
                    />
                ))}
            </div>

            <blockquote className={`relative mt-4 flex-1 text-sm leading-6 text-body sm:text-[15px] ${expanded ? "" : "line-clamp-4"}`}>
                {review.text}
            </blockquote>

            {isLong && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    className="relative mt-4 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary outline-none transition hover:text-primary-active focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    {expanded ? "Show less" : "Show more"}
                    <IconChevronDown size={15} className={`transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
            )}
        </article>
    );
};

const Reviews = ({ listingId }: { listingId: string }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError(false);
        setReviews([]);

        axios.get(`/api/reviews/${listingId}`)
            .then((res) => {
                if (active) setReviews(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {
                if (active) setLoadError(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [listingId]);

    const averageRating = useMemo(
        () => reviews.length > 0 ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0,
        [reviews]
    );

    if (loading) {
        return (
            <section aria-label="Loading guest reviews" className="mt-10">
                <div className="h-24 animate-pulse rounded-lg bg-surface-soft motion-reduce:animate-none" />
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div className="h-56 animate-pulse rounded-lg bg-surface-soft motion-reduce:animate-none" />
                    <div className="hidden h-56 animate-pulse rounded-lg bg-surface-soft motion-reduce:animate-none md:block" />
                </div>
            </section>
        );
    }

    return (
        <section className="mt-10" aria-labelledby="reviews-heading">
            <div className="flex flex-col gap-5 rounded-lg border border-hairline-soft bg-surface-soft/55 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-sm">
                        <IconUserCheck size={21} aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Guest feedback</p>
                        <h2 id="reviews-heading" className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Reviews</h2>
                    </div>
                </div>

                {reviews.length > 0 && (
                    <div className="flex items-center gap-3 rounded-md border border-accent/30 bg-white px-4 py-3 shadow-sm">
                        <span className="text-2xl font-bold tracking-tight text-ink">{averageRating.toFixed(1)}</span>
                        <div>
                            <div className="flex items-center gap-0.5" aria-hidden="true">
                                {Array.from({ length: 5 }, (_, index) => (
                                    <IconStarFilled key={index} size={14} className={index < Math.round(averageRating) ? "text-accent" : "text-hairline"} />
                                ))}
                            </div>
                            <p className="mt-1 text-[11px] text-muted">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p>
                        </div>
                    </div>
                )}
            </div>

            {loadError ? (
                <div className="mt-5 rounded-md border border-hairline-soft bg-white px-5 py-6 text-sm text-muted">
                    Reviews are unavailable right now. Please try again shortly.
                </div>
            ) : reviews.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-hairline bg-white px-6 py-10 text-center">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-active">
                        <IconStarFilled size={19} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-ink">No guest reviews yet</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">Once guests share their experience with this vehicle, their feedback will appear here.</p>
                </div>
            ) : (
                <div className={`mt-5 grid gap-5 ${reviews.length > 1 ? "md:grid-cols-2" : "max-w-2xl"}`}>
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default Reviews;
