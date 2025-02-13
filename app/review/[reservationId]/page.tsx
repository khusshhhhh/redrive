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
        imageSrc: string;
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

    if (!listing) return <p>Loading...</p>;

    return (
        <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
            <h2 className="text-xl font-bold">{listing.title}</h2>
            <Image width={500} height={50} src={listing.imageSrc} alt={listing.title} className="object-cover mt-2 rounded" />
            <h3 className="text-lg mt-4">Rate your experience</h3>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                    <span
                        key={star}
                        className={`cursor-pointer text-4xl ${rating >= star ? "text-yellow-500" : "text-gray-300"}`}
                        onClick={() => setRating(star)}
                    >
                        ★
                    </span>
                ))}
            </div>
            <textarea
                className="w-full p-2 border rounded mt-2"
                rows={3}
                placeholder="Write your review (max 100 words)..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <h3 className="text-lg mt-4 mb-4">Would you recommend this?</h3>
            <div className="flex gap-4">
                <button className={`p-2 rounded ${thumbs === "up" ? "bg-green-500 text-white" : "bg-gray-200"}`} onClick={() => setThumbs("up")}>👍 Thumbs Up</button>
                <button className={`p-2 rounded ${thumbs === "down" ? "bg-red-500 text-white" : "bg-gray-200"}`} onClick={() => setThumbs("down")}>👎 Thumbs Down</button>
            </div>
            <div className="">
                <button
                    className="mt-3 bg-teal-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    disabled={loading}
                    onClick={handleSubmit}
                >
                    {loading ? "Submitting..." : "Submit Review"}
                </button>
            </div>
        </div>
    );
};

export default ReviewPage;
