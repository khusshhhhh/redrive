"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import { IconStarFilled } from "@tabler/icons-react";

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

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center gap-3">
                <Avatar src={review.user.image} />
                <div className="flex flex-col">
                    <p className="font-semibold text-ink text-body-sm">{review.user.name}</p>
                    <p className="text-caption-sm text-muted">
                        {formatDistanceToNow(new Date(review.createdAt))} ago
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-1 text-ink">
                <IconStarFilled size={14} />
                <span className="text-body-sm font-medium">{review.rating}/5</span>
            </div>
            <p className={`text-body-sm text-body ${expanded ? "" : "line-clamp-3"}`}>
                {review.text}
            </p>
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-body-sm text-ink underline text-left w-fit"
                >
                    {expanded ? "Show less" : "Show more"}
                </button>
            )}
        </div>
    );
};

const Reviews = ({ listingId }: { listingId: string }) => {
    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        axios.get(`/api/reviews/${listingId}`).then((res) => {
            setReviews(res.data);
        });
    }, [listingId]);

    if (!reviews || reviews.length === 0) {
        return <p className="text-muted">No reviews available.</p>;
    }

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );
};

export default Reviews;
