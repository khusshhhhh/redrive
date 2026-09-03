'use client';

import { Heart } from "lucide-react";
import { SafeUser } from "../types";
import useFavorite from "../hooks/useFavorites";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser
}) => {
    const { hasFavorited, toggleFavorite, isUpdating } = useFavorite({
        listingId,
        currentUser
    })
    return (
        <button
            type="button"
            onClick={toggleFavorite}
            disabled={isUpdating}
            aria-pressed={hasFavorited}
            aria-label={hasFavorited ? "Remove from favourites" : "Save to favourites"}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none motion-reduce:transition-none ${hasFavorited ? "scale-110" : "scale-100"}`}>
            <Heart
                size={32}
                className="absolute fill-white text-white" />
            <Heart
                size={28}
                className={`transition-colors motion-reduce:transition-none ${hasFavorited ? 'fill-favorite text-favorite' : 'fill-neutral-500/40 text-neutral-500/40'}`} />
        </button>

    );
};

export default HeartButton;
