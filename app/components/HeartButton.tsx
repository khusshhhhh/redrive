'use client';

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { SafeUser } from "../types";
import useFavorite from "../hooks/useFavorites";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    /** `sm` (36px) for compact / map cards, `md` (44px) elsewhere. */
    size?: "sm" | "md";
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser,
    size = "md",
}) => {
    const { hasFavorited, toggleFavorite, isUpdating } = useFavorite({
        listingId,
        currentUser,
    });

    // Fire the pop + ring only on the transition into "saved".
    const [celebrate, setCelebrate] = useState(false);
    const wasFavorited = useRef(hasFavorited);
    useEffect(() => {
        if (hasFavorited && !wasFavorited.current) {
            setCelebrate(true);
            const timer = setTimeout(() => setCelebrate(false), 560);
            wasFavorited.current = hasFavorited;
            return () => clearTimeout(timer);
        }
        wasFavorited.current = hasFavorited;
    }, [hasFavorited]);

    const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
    const haloSize = size === "sm" ? 26 : 32;
    const heartSize = size === "sm" ? 22 : 28;

    return (
        <button
            type="button"
            onClick={toggleFavorite}
            disabled={isUpdating}
            aria-pressed={hasFavorited}
            aria-label={hasFavorited ? "Remove from favourites" : "Save to favourites"}
            className={`group/heart relative flex ${box} items-center justify-center rounded-full outline-none transition-transform hover:scale-110 active:scale-95 disabled:cursor-progress focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none motion-reduce:transition-none`}
        >
            {/* Expanding ring at the moment of saving */}
            {celebrate && (
                <span
                    aria-hidden="true"
                    className="heart-burst pointer-events-none absolute inset-0 rounded-full border-2 border-favorite"
                />
            )}

            {/* Dark halo behind, so the heart reads on any photo (light or dark) */}
            <Heart
                aria-hidden="true"
                size={haloSize}
                strokeWidth={2.25}
                className="absolute fill-black/35 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
            />

            {/* Foreground heart: rose when saved, glassy white until then */}
            <Heart
                aria-hidden="true"
                size={heartSize}
                strokeWidth={2.25}
                className={`relative transition-colors duration-200 motion-reduce:transition-none ${
                    celebrate ? "heart-pop" : ""
                } ${
                    hasFavorited
                        ? "fill-favorite text-favorite drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
                        : "fill-white/25 text-white group-hover/heart:fill-white/45"
                }`}
            />
        </button>
    );
};

export default HeartButton;
