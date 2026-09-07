'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { SafeUser } from "@/app/types";
import Image from "next/image";
import useFavorite from "@/app/hooks/useFavorites";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const { hasFavorited, toggleFavorite } = useFavorite({ listingId: id, currentUser });
    const dialogRef = useRef<HTMLDivElement>(null);
    const lastFocusedRef = useRef<HTMLElement | null>(null);

    const photos = imageSrcs.length ? imageSrcs : ["/images/placeholder.png"];
    const isOpen = selectedIndex !== null;
    const selectedImage = isOpen ? photos[selectedIndex] : null;

    const openAt = useCallback((index: number) => {
        lastFocusedRef.current = document.activeElement as HTMLElement | null;
        setSelectedIndex(index);
    }, []);
    const close = useCallback(() => setSelectedIndex(null), []);
    const step = useCallback((delta: number) => {
        setSelectedIndex((current) => {
            if (current === null) return current;
            return (current + delta + photos.length) % photos.length;
        });
    }, [photos.length]);

    // Disable background scrolling while the lightbox is open.
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }
        return () => document.body.classList.remove("overflow-hidden");
    }, [isOpen]);

    // Keyboard: Esc closes, arrows page through photos.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
            else if (event.key === "ArrowRight") step(1);
            else if (event.key === "ArrowLeft") step(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, close, step]);

    // Move focus into the dialog on open, restore it to the trigger on close.
    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.focus();
        } else {
            lastFocusedRef.current?.focus?.();
        }
    }, [isOpen]);

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
                        onClick={() => openAt(0)}
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
                            onClick={() => openAt(0)}
                        />
                    </div>

                    {imageSrcs.slice(1, 5).map((src, index) => (
                        <GridImage
                            key={index}
                            src={src}
                            alt={`${title} vehicle photo ${index + 2}`}
                            sizes="25vw"
                            onClick={() => openAt(index + 1)}
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

            {/* Photo lightbox */}
            {isOpen && selectedImage && (
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} photos`}
                    tabIndex={-1}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 outline-none sm:p-6"
                    onClick={close}
                >
                    <button
                        className="absolute right-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-surface-soft sm:right-6 sm:top-6"
                        onClick={close}
                        aria-label="Close photos"
                    >
                        <X size={24} />
                    </button>

                    {photos.length > 1 && (
                        <span className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
                            {selectedIndex! + 1} / {photos.length}
                        </span>
                    )}

                    {photos.length > 1 && (
                        <button
                            className="absolute left-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-surface-soft sm:left-6"
                            onClick={(e) => { e.stopPropagation(); step(-1); }}
                            aria-label="Previous photo"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {photos.length > 1 && (
                        <button
                            className="absolute right-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-surface-soft sm:right-6"
                            onClick={(e) => { e.stopPropagation(); step(1); }}
                            aria-label="Next photo"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    <div
                        className="relative max-h-[95dvh] w-full max-w-4xl overflow-auto rounded-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4">
                            <Image
                                alt={`${title} photo ${selectedIndex! + 1} of ${photos.length}`}
                                src={selectedImage}
                                width={1200}
                                height={900}
                                sizes="(max-width: 896px) 100vw, 896px"
                                className="h-auto w-full rounded-md object-cover"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ListingHead;
