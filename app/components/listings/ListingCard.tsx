'use client';

import { SafeListing, SafeUser, SafeReservation } from "@/app/types";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, memo, useState } from "react";
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
    priority?: boolean;
    compact?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = memo(({
    data,
    reservation,
    onAction,
    disabled,
    actionLabel,
    actionId = "",
    currentUser,
    showEditButton = false,
    priority = false,
    compact = false,
}) => {
    const router = useRouter();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleCancel = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (disabled) return;
            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const price = useMemo(() => {
        if (reservation) {
            return reservation.totalPrice;
        }
        return data.price;
    }, [reservation, data.price]);

    const reservationDate = useMemo(() => {
        if (!reservation) {
            return null;
        }
        const start = new Date(reservation.startDate);
        const end = new Date(reservation.endDate);
        return `${format(start, 'PP')} - ${format(end, 'PP')}`;
    }, [reservation]);

    // Use the first image from the array, or a fallback image if none exists.
    const imageUrl = useMemo(() => {
        if (Array.isArray(data.imageSrcs) && data.imageSrcs.length > 0) {
            return data.imageSrcs[0];
        }
        return "/images/placeholder.png";
    }, [data.imageSrcs]);

    return (
        <div
            onClick={() => router.push(`/listings/${data.id}`)}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-2 w-full">
                <div className={`${compact ? "aspect-[4/3]" : "aspect-square"} w-full relative overflow-hidden rounded-md shadow-none group-hover:shadow-card transition-shadow`}>
                    {!imageLoaded && <div className="absolute inset-0 shimmer" />}
                    <Image
                        fill
                        priority={priority}
                        sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, (max-width: 1535px) 20vw, 17vw"
                        alt="Listing"
                        src={imageUrl}
                        onLoad={() => setImageLoaded(true)}
                        className={`object-cover h-full w-full group-hover:scale-105 transition-transform duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                    />
                    {/* ✅ Show badge dynamically if it exists */}
                    {data.badgeValue && (
                        <div className="absolute left-3 top-3 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-badge font-semibold text-ink shadow-card">
                            {data.badgeValue}
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <HeartButton listingId={data.id} currentUser={currentUser} />
                    </div>
                </div>
                <div className={`${compact ? "line-clamp-2 text-sm leading-5" : "text-title-md"} font-semibold text-ink`}>{data.title}</div>
                <div className="font-normal text-muted text-body-sm">
                    {reservationDate || data.category} | {data.suburb}, {data.state}
                </div>
                <div className="flex flex-row items-center gap-1 text-body-sm text-ink">
                    <div className="font-semibold">AUD {price}</div>
                    {!reservation && <div className="font-normal text-muted">per day</div>}
                </div>
                {reservation && (
                    <div className="text-xs font-semibold text-ink">Status: {reservation.status}</div>
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
});

ListingCard.displayName = 'ListingCard';

export default ListingCard;
