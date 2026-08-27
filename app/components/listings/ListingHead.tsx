'use client';

import { useState, useEffect } from "react";
import { SafeUser } from "@/app/types";
import Image from "next/image";
import useFavorite from "@/app/hooks/useFavorites";
import { IoClose } from "react-icons/io5";
import Heading from "../Heading";
import toast from "@/app/libs/toast";
import { IconLayoutGrid, IconShare2, IconHeart, IconHeartFilled } from "@tabler/icons-react";

interface ListingHeadProps {
    title: string;
    imageSrcs: string[];
    id: string;
    currentUser?: SafeUser | null;
}

interface GridImageProps {
    src: string;
    alt: string;
    sizes: string;
    onClick: () => void;
    priority?: boolean;
}

// A grid tile that shimmers while its image loads, then fades it in —
// keeps the photo grid feeling alive instead of popping images in abruptly.
const GridImage: React.FC<GridImageProps> = ({ src, alt, sizes, onClick, priority }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="relative w-full h-full overflow-hidden cursor-pointer" onClick={onClick}>
            {!loaded && <div className="absolute inset-0 shimmer" />}
            <Image
                fill
                priority={priority}
                alt={alt}
                src={src}
                sizes={sizes}
                onLoad={() => setLoaded(true)}
                className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
        </div>
    );
};

const ListingHead: React.FC<ListingHeadProps> = ({
    imageSrcs = [],
    title,
    id,
    currentUser
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const { hasFavorited, toggleFavorite } = useFavorite({ listingId: id, currentUser });

    // Disable background scrolling when modal is open
    useEffect(() => {
        if (selectedImage) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }

        return () => document.body.classList.remove("overflow-hidden");
    }, [selectedImage]);

    const onShare = async () => {
        const url = typeof window !== "undefined" ? window.location.href : "";
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch {
                // user cancelled the native share sheet - no-op
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        } catch {
            toast.error("Couldn't copy link");
        }
    };

    return (
        <>
            {/* Title row: title left, Share / Save actions right */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><Heading title={title} subtitle="" /></div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-5">
                    <button
                        onClick={onShare}
                        aria-label="Share this listing"
                        className="flex h-11 w-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-ink transition hover:bg-surface-soft hover:text-muted sm:h-auto sm:w-auto sm:rounded-none sm:underline"
                    >
                        <IconShare2 size={18} />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                    <div
                        onClick={toggleFavorite}
                        role="button"
                        tabIndex={0}
                        aria-label={hasFavorited ? "Remove listing from favourites" : "Save listing to favourites"}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleFavorite(event);
                            }
                        }}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-ink transition hover:bg-surface-soft hover:text-muted sm:h-auto sm:w-auto sm:rounded-none sm:underline"
                    >
                        {hasFavorited ? (
                            <IconHeartFilled size={18} className="text-favorite" />
                        ) : (
                            <IconHeart size={18} />
                        )}
                        <span className="hidden sm:inline">Save</span>
                    </div>
                </div>
            </div>

            {/* Responsive Image Display */}
            <div className="relative w-full mt-4">
                {/* Show Only One Image on Mobile */}
                <div className="relative aspect-[3/2] max-h-[420px] overflow-hidden rounded-md md:hidden">
                    <GridImage
                        src={imageSrcs[0] || "/images/placeholder.png"}
                        alt={`${title} main vehicle photo`}
                        sizes="100vw"
                        priority
                        onClick={() => setSelectedImage(imageSrcs[0] || "/images/placeholder.png")}
                    />
                    {imageSrcs.length > 1 && (
                        <button
                            className="absolute bottom-3 right-3 flex min-h-11 flex-row items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card"
                            onClick={() => window.location.assign(`/listings/${id}/images`)}
                        >
                            <IconLayoutGrid size={18} stroke={1.5} /><span>Show all photos</span>
                        </button>
                    )}
                </div>

                {/* Image Grid (Only for Desktop) — a single rounded rectangle clipping
                    the whole grid, matching Airbnb's unified photo-grid card shape. */}
                <div className="relative hidden md:grid grid-cols-4 grid-rows-2 gap-2 w-full h-[480px] rounded-xl overflow-hidden">
                    <div className="col-span-2 row-span-2">
                        <GridImage
                            src={imageSrcs[0] || "/images/placeholder.png"}
                            alt={`${title} main vehicle photo`}
                            sizes="50vw"
                            priority
                            onClick={() => setSelectedImage(imageSrcs[0] || "/images/placeholder.png")}
                        />
                    </div>

                    {imageSrcs.slice(1, 5).map((src, index) => (
                        <GridImage
                            key={index}
                            src={src}
                            alt={`${title} vehicle photo ${index + 2}`}
                            sizes="25vw"
                            onClick={() => setSelectedImage(src)}
                        />
                    ))}

                    {imageSrcs.length > 1 && (
                        <button
                            className="flex flex-row gap-1 items-center absolute bottom-4 right-4 bg-white text-ink font-semibold text-sm px-4 py-2 rounded-full shadow-card hover:bg-surface-soft transition"
                            onClick={() => window.location.assign(`/listings/${id}/images`)}
                        >
                            <IconLayoutGrid size={18} stroke={1.5} /><span>Show all photos</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Single Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-6"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative max-h-[95dvh] w-full max-w-4xl overflow-auto rounded-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute right-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-surface-soft sm:right-6 sm:top-6"
                            onClick={() => setSelectedImage(null)}
                        >
                            <IoClose size={24} />
                        </button>

                        {/* Full Image Display */}
                        <div className="p-4">
                            <Image
                                alt={`${title} enlarged vehicle photo`}
                                src={selectedImage}
                                width={800}
                                height={600}
                                className="object-cover w-full h-auto rounded-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ListingHead;
