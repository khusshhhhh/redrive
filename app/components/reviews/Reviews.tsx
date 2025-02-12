"use client";

import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState, useRef } from "react";
import Avatar from "../Avatar";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0); // For mobile swipe

    useEffect(() => {
        axios.get(`/api/reviews/${listingId}`).then((res) => {
            setReviews(res.data);
        });
    }, [listingId]);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    const handleSwipeLeft = () => {
        if (currentIndex < reviews.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleSwipeRight = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (!reviews || reviews.length === 0) {
        return <p className="text-gray-500">No reviews available.</p>;
    }

    return (
        <div className="w-full">
            <h3 className="text-xl font-semibold mb-4">Reviews</h3>

            {/* ✅ Desktop View (Scrollable with Buttons) */}
            <div className="relative hidden md:flex items-center">
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 z-10 bg-black text-white rounded-full p-2 transition"
                >
                    <FaChevronLeft size={20} />
                </button>

                <div ref={scrollRef} className="ml-2 flex flex-row gap-4 overflow-x-auto scrollbar-hide scroll-smooth w-full px-10">
                    {reviews.slice(0, 3).map((review) => ( // Show first 6 reviews
                        <div key={review.id} className="w-[30%] min-w-[250px] border-[1px] p-4 my-2 rounded-lg flex-shrink-0">
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

                <button
                    onClick={scrollRight}
                    className="absolute right-0 z-10 bg-black text-white rounded-full p-2 transition"
                >
                    <FaChevronRight size={20} />
                </button>
            </div>

            {/* ✅ Mobile View (Swipe One Review at a Time) */}
            <div className="md:hidden flex flex-col items-center text-center">
                <div className="border-[1px] p-4 rounded-lg w-full">
                    <div className="flex flex-row items-center justify-between mb-4">
                        <div className="flex flex-row items-center gap-4">
                            <Avatar src={reviews[currentIndex].user.image} />
                            <p className="font-semibold">{reviews[currentIndex].user.name}</p>
                        </div>
                        <div>
                            <p className="text-lg font-semibold">⭐ {reviews[currentIndex].rating}/5</p>
                        </div>
                    </div>
                    <div className="mb-4">
                        <p>{reviews[currentIndex].text}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">{formatDistanceToNow(new Date(reviews[currentIndex].createdAt))} ago</p>
                    </div>
                </div>

                {/* Swipe Navigation for Mobile */}
                <div className="flex justify-between w-full mt-3">
                    <button
                        onClick={handleSwipeRight}
                        disabled={currentIndex === 0}
                        className={`p-2 rounded-full ${currentIndex === 0 ? "bg-gray-300" : "bg-gray-200 hover:bg-gray-400"}`}
                    >
                        <FaChevronLeft size={20} />
                    </button>

                    <button
                        onClick={handleSwipeLeft}
                        disabled={currentIndex === reviews.length - 1}
                        className={`p-2 rounded-full ${currentIndex === reviews.length - 1 ? "bg-gray-300" : "bg-gray-200 hover:bg-gray-400"}`}
                    >
                        <FaChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reviews;
