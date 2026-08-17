'use client';

import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
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
    const { hasFavorited, toggleFavorite } = useFavorite({
        listingId,
        currentUser
    })
    return (
        <div
            onClick={toggleFavorite}
            className="relative hover:opacity-80 transition cursor-pointer">
            <AiOutlineHeart
                size={32}
                className="fill-white absolute -top-[2px] -right-[2px]" />
            <AiFillHeart
                size={28}
                className={hasFavorited ? 'fill-favorite' : 'fill-neutral-500/40'} />
        </div>

    );
};

export default HeartButton;
