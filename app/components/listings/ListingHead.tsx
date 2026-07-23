'use client';

import { useState, useEffect } from "react";
import { SafeUser } from "@/app/types";
import Image from "next/image";
import HeartButton from "../HeartButton";
import { IoClose } from "react-icons/io5";
import Heading from "../Heading";
import { useRouter } from "next/navigation";
import { IconLayoutCollage, IconCaretLeftFilled } from "@tabler/icons-react";

interface ListingHeadProps {
    title: string;
    imageSrcs: string[];
    id: string;
    currentUser?: SafeUser | null;
}

const ListingHead: React.FC<ListingHeadProps> = ({
    imageSrcs = [],
    title,
    id,
    currentUser
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const router = useRouter();

    // Disable background scrolling when modal is open
    useEffect(() => {
        if (selectedImage) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }

        return () => document.body.classList.remove("overflow-hidden");
    }, [selectedImage]);

    return (
        <>
            {/* Title */}
            <div className="font-semibold">
                <Heading title={title} subtitle="" />
            </div>

            {/* Responsive Image Display */}
            <div className="relative w-full">
                {/* Show Only One Image on Mobile */}
                <div className="relative rounded-lg overflow-hidden cursor-pointer md:hidden"
                    onClick={() => setSelectedImage(imageSrcs[0])}
                >
                    <Image
                        alt="Main Image"
                        src={imageSrcs[0]}
                        width={800}
                        height={500}
                        className="object-cover w-full h-[300px] sm:h-[400px] rounded-lg"
                    />

                    <div className="absolute top-3 left-3">
                        <button className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 p-1 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.back()
                            }}>
                            <IconCaretLeftFilled size={24} />
                        </button>
                    </div>
                    <div>
                        {/* Show All Images Button */}
                        <button
                            className="flex flex-row gap-1 items-center absolute bottom-3 left-3 bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 font-semibold text-sm px-4 py-2 rounded-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/listings/${id}/images`);
                            }}
                        >
                            <IconLayoutCollage size={20} stroke={1.5} /><span>Show all</span>
                        </button>
                    </div>

                    {/* Heart Button */}
                    <div className="absolute top-3 right-3">
                        <HeartButton listingId={id} currentUser={currentUser} />
                    </div>
                </div>

                {/* Image Grid (Only for Desktop) */}
                <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 w-full">
                    {/* Large Main Image */}
                    <div
                        className="relative col-span-2 row-span-2 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setSelectedImage(imageSrcs[0])}
                    >
                        <Image
                            alt="Main Image"
                            src={imageSrcs[0]}
                            width={800}
                            height={500}
                            className="object-cover w-full h-full rounded-lg"
                        />

                        <div className="absolute top-3 left-3">
                            <button className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 p-1 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.back()
                                }}>
                                <IconCaretLeftFilled size={24} />
                            </button>
                        </div>

                        {/* Show All Images Button */}
                        <div>
                            <button
                                className="flex flex-row gap-1 items-center absolute bottom-3 left-3 bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 font-semibold text-sm px-4 py-2 rounded-md"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/listings/${id}/images`);
                                }}
                            >
                                <IconLayoutCollage size={20} stroke={1.5} /><span>Show all</span>
                            </button>
                        </div>

                        {/* Heart Button */}
                        <div className="absolute top-3 right-3">
                            <HeartButton listingId={id} currentUser={currentUser} />
                        </div>
                    </div>

                    {/* Smaller Images */}
                    {imageSrcs.slice(1, 5).map((src, index) => (
                        <div
                            key={index}
                            className="relative rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setSelectedImage(src)}
                        >
                            <Image
                                alt={`Thumbnail ${index + 2}`}
                                src={src}
                                width={250}
                                height={200}
                                className="object-cover w-full h-full rounded-lg"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Single Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative w-[90%] max-w-4xl rounded-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-6 right-6 bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 rounded-full p-2 z-50 hover:bg-gray-300 dark:hover:bg-neutral-700 transition"
                            onClick={() => setSelectedImage(null)}
                        >
                            <IoClose size={24} />
                        </button>

                        {/* Full Image Display */}
                        <div className="p-4">
                            <Image
                                alt="Full Image"
                                src={selectedImage}
                                width={800}
                                height={600}
                                className="object-cover w-full h-auto rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ListingHead;
