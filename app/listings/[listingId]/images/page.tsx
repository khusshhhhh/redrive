"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";

const ListingImages = () => {
    const router = useRouter();
    const { listingId } = useParams();
    const [imageSrcs, setImageSrcs] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    // Fetch images from API
    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await fetch(`/api/listings/${listingId}`);
                const data = await response.json();
                setImageSrcs(data.imageSrcs || []);
            } catch (error) {
                console.error("Error fetching images:", error);
            }
        };

        if (listingId) {
            fetchImages();
        }
    }, [listingId]);

    // Convert images to react-image-gallery format
    const galleryImages = imageSrcs.map((src) => ({
        original: src,
        thumbnail: src,
    }));

    const openGallery = (index: number) => {
        setStartIndex(index);
        setIsOpen(true);
    };

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-24">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="mb-4 bg-white font-semibold text-black border-[2px] border-black hover:bg-black hover:text-white transition px-4 py-2 rounded-md"
            >
                Back
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-6">Listing Gallery</h2>

            {/* Responsive Masonry Grid for Images */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {imageSrcs.map((src, index) => (
                    <div
                        key={index}
                        className={`relative rounded-lg overflow-hidden cursor-pointer 
                        ${index % 6 === 0 ? "md:col-span-2 md:row-span-2" : "md:col-span-1 md:row-span-1"}`}
                        onClick={() => openGallery(index)}
                    >
                        <Image
                            alt={`Listing Image ${index + 1}`}
                            src={src}
                            width={800}
                            height={600}
                            className="object-cover w-full h-auto md:h-full rounded-lg"
                        />
                    </div>
                ))}
            </div>

            {/* Lightbox Modal using react-image-gallery */}
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
                    <div className="relative max-w-5xl w-full">
                        {/* Close Button */}
                        <button
                            className="absolute top-4 right-4 bg-white text-black p-2 rounded-full"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>

                        {/* Image Gallery */}
                        <ImageGallery
                            items={galleryImages}
                            startIndex={startIndex}
                            showThumbnails={true}
                            showFullscreenButton={false}
                            showPlayButton={false}
                            onClick={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListingImages;
