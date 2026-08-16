"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import Image from "next/image";

const ReviewPage = () => {
    const router = useRouter();
    const params = useParams();
    const reservationId = params?.reservationId as string;

    interface Listing {
        id: string;
        title: string;
        imageSrcs: string[];
    }

    const [listing, setListing] = useState<Listing | null>(null);
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [thumbs, setThumbs] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!reservationId) return;

        axios.get(`/api/reservations/${reservationId}`)
            .then(response => {
                setListing(response.data.listing);
            })
            .catch(() => {
                toast.error("Failed to load listing.");
            });
    }, [reservationId]);

    const handleSubmit = async () => {
        if (!rating || !text || !thumbs) {
            toast.error("Please provide a rating, review, and thumbs up/down.");
            return;
        }
        if (text.split(" ").length > 100) {
            toast.error("Review must be within 100 words.");
            return;
        }

        setLoading(true);
        try {
            if (listing) {
                await axios.post("/api/reviews", { listingId: listing.id, rating, text, thumbs });
            } else {
                toast.error("Listing not found.");
            }
            toast.success("Review submitted!");
            router.push("/trips");
        } catch (error) {
            const errorMessage = (error as AxiosError<{ error: string }>).response?.data?.error || "Something went wrong.";
            toast.error(errorMessage);
        }
        setLoading(false);
    };

    if (!listing) {
        return (
            <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
                <div className="h-6 shimmer rounded w-1/2" />
                <div className="h-40 shimmer rounded" />
                <div className="h-4 shimmer rounded w-1/3" />
                <div className="h-4 shimmer rounded" />
                <div className="h-4 shimmer rounded" />
            </div>
        );
    }

    return (
        <main className="bg-surface-soft/35 px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-lg rounded-md border border-hairline-soft bg-white p-4 shadow-card sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your experience</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Review {listing.title}</h1>
            <div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-md"><Image fill sizes="(max-width: 640px) 100vw, 512px" src={listing.imageSrcs?.[0] || "/images/placeholder.png"} alt={listing.title} className="object-cover" /></div>
            <h2 className="mt-6 text-lg font-semibold text-ink">Rate your experience</h2>
            <div className="mt-2 flex justify-between gap-1 sm:justify-start sm:gap-2" role="group" aria-label="Rating out of five">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        type="button"
                        key={star}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        className={`flex h-12 w-12 items-center justify-center text-4xl ${rating >= star ? "text-primary" : "text-hairline"}`}
                        onClick={() => setRating(star)}
                    >
                        ★
                    </button>
                ))}
            </div>
            <textarea
                className="mt-4 min-h-32 w-full resize-y rounded-sm border border-hairline p-3 text-base text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Write your review (max 100 words)..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <h2 className="mb-3 mt-5 text-lg font-semibold text-ink">Would you recommend it?</h2>
            <div className="grid grid-cols-2 gap-3">
                <button className={`min-h-12 rounded-sm border px-3 font-semibold ${thumbs === "up" ? "border-primary bg-primary text-white" : "border-hairline bg-white text-ink"}`} onClick={() => setThumbs("up")}>👍 Yes</button>
                <button className={`min-h-12 rounded-sm border px-3 font-semibold ${thumbs === "down" ? "border-primary bg-primary text-white" : "border-hairline bg-white text-ink"}`} onClick={() => setThumbs("down")}>👎 No</button>
            </div>
            <div className="">
                <button
                    className="mt-6 min-h-12 w-full rounded-sm bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-active disabled:opacity-50"
                    disabled={loading}
                    onClick={handleSubmit}
                >
                    {loading ? "Submitting..." : "Submit Review"}
                </button>
            </div>
        </div>
        </main>
    );
};

export default ReviewPage;
