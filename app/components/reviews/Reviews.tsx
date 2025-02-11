import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

const Reviews = ({ listingId }: { listingId: string }) => {
    interface Review {
        id: string;
        user: {
            name: string;
        };
        rating: number;
        text: string;
        createdAt: string;
    }

    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        axios.get(`/api/reviews/${listingId}`).then((res) => {
            setReviews(res.data);
        });
    }, [listingId]);

    return (
        <div>
            <h3 className="text-lg font-semibold">Reviews</h3>
            {reviews.map((review) => (
                <div key={review.id} className="border p-3 my-2 rounded">
                    <p className="font-semibold">{review.user.name}</p>
                    <p>⭐ {review.rating}/5</p>
                    <p>{review.text}</p>
                    <p className="text-gray-500">{formatDistanceToNow(new Date(review.createdAt))} ago</p>
                </div>
            ))}
        </div>
    );
};

export default Reviews;
