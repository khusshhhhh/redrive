'use client';

import { Listing, Reservation } from "@prisma/client";

import { SafeUser } from "@/app/types";
import { useRouter } from "next/navigation";
import useCountries from "@/app/hooks/useCountries";


interface ListingCardProps {
    data: Listing;
    reservation?: Reservation;
    onAction?: (id: string) => void;
    disabled?: boolean;
    actionLabel?: string;
    actionId?: string;
    currentUser?: SafeUser | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
    data,
    reservation,
    onAction,
    disabled,
    actionLabel,
    actionId = "",
    currentUser
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();

    const location = getByValue(data.locationValue)

    return (
        <div>Listing Card</div>
    );
}

export default ListingCard;
