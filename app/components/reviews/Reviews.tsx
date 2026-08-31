"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import Avatar from "../Avatar";
import { IconChevronDown, IconCornerDownRight, IconStarFilled, IconUserCheck } from "@tabler/icons-react";
import toast from "@/app/libs/toast";
import StarRating from "../inputs/StarRating";
import RatingSummary from "./RatingSummary";

interface Review {
    id: string;
    user: {
        image: string | null | undefined;
        name: string;
    };
    rating: number;
    text: string;
    response?: string | null;
    respondedAt?: string | null;
    createdAt: string;
}

const ReviewCard = ({
    review,
    canRespond,
    onResponded,
}: {
    review: Review;
    canRespond?: boolean;
    onResponded?: (id: string, response: string) => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [saving, setSaving] = useState(false);
    const isLong = review.text.length > 180;

    const submitReply = async () => {
        if (replyText.trim().length < 3) return;
        setSaving(true);
        try {
            await axios.post("/api/reviews/respond", { reviewId: review.id, response: replyText.trim() });
            onResponded?.(review.id, replyText.trim());
            setReplying(false);
        } catch (error) {
            toast.error(
                axios.isAxiosError<{ error?: string }>(error)
                    ? error.response?.data?.error || "Reply could not be saved"
                    : "Reply could not be saved",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-white p-5 shadow-[0_10px_30px_rgba(22, 22, 22,0.07)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_36px_rgba(22, 22, 22,0.11)] motion-reduce:transform-none motion-reduce:transition-none sm:p-6">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden="true" />
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

                <div className="flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-soft px-2.5 py-1 text-xs font-bold text-ink" aria-label={`${review.rating} out of 5 stars`}>
                    <IconStarFilled size={14} className="text-ink" aria-hidden="true" />
                    {review.rating.toFixed(1)}
                </div>
            </header>

            <div className="relative mt-5">
                <StarRating value={review.rating} size={15} label="Guest rating" />
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

            {review.response && (
                <div className="relative mt-4 rounded-md border border-hairline-soft bg-surface-soft/70 p-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        <IconCornerDownRight size={13} aria-hidden="true" /> Response from the host
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-body">{review.response}</p>
                </div>
            )}

            {canRespond && !review.response && (
                <div className="relative mt-4">
                    {replying ? (
                        <div className="rounded-md border border-hairline-soft p-3">
                            <textarea
                                value={replyText}
                                onChange={(event) => setReplyText(event.target.value.slice(0, 1500))}
                                rows={3}
                                placeholder="Reply publicly — keep it brief and professional."
                                className="w-full rounded-sm border border-hairline bg-white p-2 text-sm outline-none focus:border-primary"
                            />
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    disabled={saving || replyText.trim().length < 3}
                                    onClick={() => void submitReply()}
                                    className="h-9 rounded-sm bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                    {saving ? "Posting…" : "Post reply"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReplying(false)}
                                    className="h-9 rounded-sm border border-hairline px-3 text-xs font-semibold text-muted"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setReplying(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-active"
                        >
                            <IconCornerDownRight size={14} aria-hidden="true" /> Reply to this review
                        </button>
                    )}
                </div>
            )}
        </article>
    );
};

const Reviews = ({ listingId, canRespond }: { listingId: string; canRespond?: boolean }) => {
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

    const distribution = useMemo(() => {
        const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const review of reviews) {
            const star = Math.min(5, Math.max(1, Math.round(review.rating)));
            buckets[star] += 1;
        }
        return buckets;
    }, [reviews]);

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
                    <div className="rounded-md border border-hairline bg-white px-4 py-3.5 shadow-sm sm:min-w-[19rem]">
                        <RatingSummary average={averageRating} total={reviews.length} distribution={distribution} />
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
                        <ReviewCard
                            key={review.id}
                            review={review}
                            canRespond={canRespond}
                            onResponded={(id, response) =>
                                setReviews((current) =>
                                    current.map((item) =>
                                        item.id === id ? { ...item, response } : item,
                                    ),
                                )
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default Reviews;
