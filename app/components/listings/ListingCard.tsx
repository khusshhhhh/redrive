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
            data-scroll-reveal
            onClick={() => router.push(`/listings/${data.id}`)}
            onKeyDown={(event) => {
                if (event.currentTarget === event.target && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    router.push(`/listings/${data.id}`);
                }
            }}
            role="link"
            tabIndex={0}
            aria-label={`View ${data.title} in ${data.suburb}, ${data.state}`}
            className="group col-span-1 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
        >
            <div className="flex w-full flex-col gap-2">
                <div className={`${compact ? "aspect-[4/3]" : "aspect-[3/2] md:aspect-square"} relative w-full overflow-hidden rounded-md shadow-none transition-shadow group-hover:shadow-card`}>
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
                <div className={`${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-[15px] sm:text-title-md"} font-semibold leading-5 text-ink`}>{data.title}</div>
                <div className="truncate text-[13px] font-normal text-muted sm:text-body-sm">
                    {reservationDate || data.category} <span aria-hidden="true">·</span> {data.suburb}, {data.state}
                </div>
                <div className="flex flex-row items-center gap-1 text-[13px] text-ink sm:text-body-sm">
                    <div className="font-semibold">AU${price}</div>
                    {!reservation && <div className="font-normal text-muted">per day</div>}
                </div>
                {!reservation && data.instantBook && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                        <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
                        Instant Book
                    </div>
                )}
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
