'use client';

import { SafeUser, SafeReservation } from "@/app/types";
import type { ListingCardData } from "@/app/libs/listingCardData";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, memo } from "react";
import Image from "next/image";
import HeartButton from "../HeartButton";
import ListingCardButton from "../ListingCardButton";
import { IconArrowsExchange, IconRosetteDiscountCheck, IconStar } from "@tabler/icons-react";
import useCompareVehicles from "@/app/hooks/useCompareVehicles";
import toast from "@/app/libs/toast";

const reservationDateFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

interface ListingCardProps {
    data: ListingCardData;
    reservation?: SafeReservation;
    onAction?: (id: string) => void;
    disabled?: boolean;
    actionLabel?: string;
    actionId?: string;
    currentUser?: SafeUser | null;
    showEditButton?: boolean;
    priority?: boolean;
    compact?: boolean;
    tripDays?: number | null;
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
    tripDays = null,
}) => {
    const router = useRouter();
    const { toggle, includes } = useCompareVehicles();
    const isCompared = includes(data.id);

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
        return `${reservationDateFormatter.format(start)} – ${reservationDateFormatter.format(end)}`;
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
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface-soft shadow-none transition-shadow group-hover:shadow-card">
                    <Image
                        fill
                        priority={priority}
                        sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, (max-width: 1535px) 20vw, 17vw"
                        alt={`${data.title}, a ${data.category.toLowerCase()} available in ${data.suburb}, ${data.state}`}
                        src={imageUrl}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
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
                    {!reservation && !showEditButton && <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            const result = toggle(data);
                            if (result === "full") toast.error("Compare up to three vehicles at a time");
                        }}
                        aria-pressed={isCompared}
                        aria-label={`${isCompared ? "Remove" : "Add"} ${data.title} ${isCompared ? "from" : "to"} comparison`}
                        className={`absolute bottom-3 left-3 inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isCompared ? "border-primary bg-primary text-white" : "border-white/70 bg-white/95 text-ink hover:bg-surface-soft"}`}
                    >
                        <IconArrowsExchange size={15} aria-hidden="true" /> {isCompared ? "Added" : "Compare"}
                    </button>}
                </div>
                <div className="flex min-h-10 items-start justify-between gap-2">
                    <div className={`${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-[15px] sm:text-title-md"} font-semibold leading-5 text-ink`}>{data.title}</div>
                    {Boolean(data.reviewCount) && <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold text-ink"><IconStar size={14} className="fill-accent text-accent" /> {data.reviewAverage?.toFixed(1)}</span>}
                </div>
                <div className="truncate text-[13px] font-normal text-muted sm:text-body-sm">
                    {reservationDate || data.category} <span aria-hidden="true">·</span> {data.suburb}, {data.state}
                </div>
                <div className="text-[13px] text-ink sm:text-body-sm">
                    <div><span className="font-semibold">AU${!reservation && tripDays ? price * tripDays : price}</span>{!reservation && <span className="ml-1 font-normal text-muted">{tripDays ? `estimated total · ${tripDays} days` : "per day"}</span>}</div>
                    {!reservation && tripDays && <div className="mt-0.5 text-xs text-muted">AU${price} per day</div>}
                </div>
                {!reservation && (data.reviewCount !== undefined || data.hostVerified || data.hostResponseHours !== undefined) && (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                        {Boolean(data.reviewCount) && <span>{data.reviewCount} review{data.reviewCount === 1 ? "" : "s"}</span>}
                        {data.hostVerified && <span className="inline-flex items-center gap-1 text-secondary"><IconRosetteDiscountCheck size={15} /> Verified host</span>}
                        {data.hostResponseHours != null && <span>{data.hostResponseHours < 1 ? "Responds within an hour" : data.hostResponseHours < 24 ? `Responds in ~${Math.ceil(data.hostResponseHours)}h` : `Responds in ~${Math.ceil(data.hostResponseHours / 24)}d`}</span>}
                    </div>
                )}
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
