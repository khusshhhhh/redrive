"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useParams } from "next/navigation";
import { IconX } from "@tabler/icons-react";
import type { LightboxImage } from "./LightboxGallery";

// react-image-gallery (+ its CSS) is ~40 KB and only needed once the lightbox
// opens, so it's code-split behind this dynamic import.
const LightboxGallery = dynamic(() => import("./LightboxGallery"), { ssr: false });

const ListingImages = () => {
    const router = useRouter();
    const { listingId } = useParams();
    const [imageSrcs, setImageSrcs] = useState<string[]>([]);
    const [listingTitle, setListingTitle] = useState("Vehicle");
    const [isOpen, setIsOpen] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await fetch(`/api/listings/${listingId}`);
                const data = await response.json();
                setImageSrcs(data.imageSrcs || []);
                setListingTitle(data.title || "Vehicle");
            } catch (error) {
                console.error("Error fetching images:", error);
            }
        };

        if (listingId) {
            fetchImages();
        }
    }, [listingId]);

    const galleryImages: LightboxImage[] = useMemo(
        () =>
            imageSrcs.map((src, index) => ({
                original: src,
                thumbnail: src,
                originalAlt: `${listingTitle} vehicle photo ${index + 1}`,
                thumbnailAlt: `${listingTitle} photo ${index + 1} thumbnail`,
            })),
        [imageSrcs, listingTitle],
    );

    const openGallery = (index: number) => {
        setStartIndex(index);
        setIsOpen(true);
    };

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-24">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="mb-4 bg-white font-semibold text-ink border border-ink hover:bg-ink hover:text-white transition px-4 py-2 rounded-sm"
            >
                Back
            </button>

            {/* Title */}
            <h2 className="text-display-sm font-semibold text-center text-ink mb-6">Photo Gallery</h2>

            {/* Responsive Masonry Grid for Images */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
                {imageSrcs.map((src, index) => (
                    <div
                        key={index}
                        className={`relative rounded-md overflow-hidden cursor-pointer
                        ${index % 6 === 0 ? "md:col-span-2 md:row-span-2" : "md:col-span-1 md:row-span-1"}`}
                        onClick={() => openGallery(index)}
                    >
                        <Image
                            alt={`${listingTitle} vehicle photo ${index + 1}`}
                            src={src}
                            width={800}
                            height={600}
                            className="object-cover w-full h-auto md:h-full rounded-md"
                        />
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
                    <div className="relative max-w-5xl w-full">
                        <button
                            className="absolute top-4 right-4 bg-white text-ink p-2 z-50 rounded-full shadow-card"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close gallery"
                        >
                            <IconX size={18} />
                        </button>

                        <LightboxGallery
                            items={galleryImages}
                            startIndex={startIndex}
                            onClose={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default ListingImages;
