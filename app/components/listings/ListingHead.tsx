'use client';

import { useState, useEffect } from "react";
import useCountries from "@/app/hooks/useCountries";
import { SafeUser } from "@/app/types";
import Heading from "../Heading";
import Image from "next/image";
import HeartButton from "../HeartButton";
import { IoClose } from "react-icons/io5";

interface ListingHeadProps {
    title: string;
    locationValue: string;
    imageSrc: string;
    id: string;
    currentUser?: SafeUser | null;
}

const ListingHead: React.FC<ListingHeadProps> = ({
    title,
    locationValue,
    imageSrc,
    id,
    currentUser
}) => {
    const { getByValue } = useCountries();
    const location = getByValue(locationValue);

    // State for image modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Disable background scrolling when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }

        // Cleanup when component unmounts
        return () => document.body.classList.remove("overflow-hidden");
    }, [isModalOpen]);

    return (
        <>
            {/* Title & Location */}
            <Heading
                title={title}
                subtitle={`${location?.region}, ${location?.label}`}
            />

            {/* Listing Image - Click to Open Modal */}
            <div
                className="w-full h-[60vh] overflow-hidden rounded-xl relative cursor-pointer"
                onClick={() => setIsModalOpen(true)}
            >
                <Image
                    alt="Image"
                    src={imageSrc}
                    fill
                    className="object-cover w-full"
                />
                <div className="absolute top-5 right-5">
                    <HeartButton
                        listingId={id}
                        currentUser={currentUser}
                    />
                </div>
            </div>

            {/* Fullscreen Image Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    onClick={() => setIsModalOpen(false)} // Close on outside click
                >
                    <div
                        className="relative w-[90%] h-[90%] rounded-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-1 right-1 bg-white text-black rounded-full p-2 z-50 hover:bg-gray-300 transition"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <IoClose size={24} />
                        </button>

                        {/* Fullscreen Image */}
                        <Image
                            alt="Full Image"
                            src={imageSrc}
                            fill
                            className="object-contain w-full h-full"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default ListingHead;
