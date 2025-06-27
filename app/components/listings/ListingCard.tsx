'use client';

import { SafeListing, SafeUser, SafeReservation } from "@/app/types";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";
import { format } from 'date-fns';
import Image from "next/image";
import HeartButton from "../HeartButton";
import ListingCardButton from "../ListingCardButton";

interface ListingCardProps {
    data: SafeListing;
    reservation?: SafeReservation;
    onAction?: (id: string) => void;
    disabled?: boolean;
    actionLabel?: string;
    actionId?: string;
    currentUser?: SafeUser | null;
    showEditButton?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
    data,
    reservation,
    onAction,
    disabled,
    actionLabel,
    actionId = "",
    currentUser,
    showEditButton = false,
}) => {
    const router = useRouter();

    const handleCancel = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (disabled) return;
            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const price = useMemo(() => {
        return reservation ? reservation.totalPrice : data.price;
    }, [reservation, data.price]);

    const reservationDate = useMemo(() => {
        if (!reservation) return null;
        const start = new Date(reservation.startDate);
        const end = new Date(reservation.endDate);
        return `${format(start, 'PP')} - ${format(end, 'PP')}`;
    }, [reservation]);

    // Use the first image from the array, or a fallback image if none exists.
    const imageUrl = useMemo(() => {
        if (Array.isArray(data.imageSrcs) && data.imageSrcs.length > 0) {
            return data.imageSrcs[0];
        }
        return "/placeholder.png"; // Change to your placeholder image path
    }, [data.imageSrcs]);

    return (
        <div
            onClick={() => router.push(`/listings/${data.id}`)}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-2 w-full">
                <div className="aspect-square w-full relative overflow-hidden rounded-xl">
                    <Image
                        fill
                        priority
                        sizes="100%"
                        alt="Listing"
                        src={imageUrl}
                        className="object-cover h-full w-full group-hover:scale-110 transition-all"
                    />
                    {/* ✅ Show badge dynamically if it exists */}
                    {data.badgeValue && (
                        <div className="absolute top-3 left-3 bg-white dark:bg-gray-800 text-black dark:text-white font-bold text-sm px-4 py-2 rounded-md">
                            {data.badgeValue}
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <HeartButton listingId={data.id} currentUser={currentUser} />
                    </div>
                </div>
                <div className="font-medium text-base">{data.title}</div>
                <div className="font-light text-neutral-500 text-xs">
                    {reservationDate || data.category} | {data.suburb}, {data.state}
                </div>
                <div className="flex flex-row items-center gap-1 text-sm">
                    <div className="font-medium">AUD {price}</div>
                    {!reservation && <div className="font-light">per day</div>}
                </div>
                {reservation && (
                    <div className="text-xs font-semibold">Status: {reservation.status}</div>
                )}
                <div className="gap-0">
                    {/* ✅ Show Edit Button only if 'showEditButton' is true */}
                    {showEditButton && (
                        <ListingCardButton
                            label="Edit Utility"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/edit-utility/${data.id}`);
                            }}
                        />
                    )}

                    {onAction && actionLabel && (
                        <ListingCardButton
                            disabled={disabled}
                            label={actionLabel}
                            onClick={handleCancel}
                            variant="danger"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListingCard;
