import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";

const Reviews = ({ listingId }: { listingId: string }) => {
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

    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        axios.get(`/api/reviews/${listingId}`).then((res) => {
            setReviews(res.data);
        });
    }, [listingId]);

    return (
        <div>
            <h3 className="text-xl font-semibold">Reviews</h3>
            <div className="flex flex-row gap-4">
                {reviews.map((review) => (
                    <div key={review.id} className="w-[30%] border-[1px] p-4 my-2 rounded-lg">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div className="flex flex-row items-center gap-4">
                                <Avatar src={review.user.image} />
                                <p className="font-semibold">{review.user.name}</p>
                            </div>
                            <div>
                                <p className="text-lg font-semibold">⭐ {review.rating}/5</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <p>{review.text}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">{formatDistanceToNow(new Date(review.createdAt))} ago</p>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default Reviews;
