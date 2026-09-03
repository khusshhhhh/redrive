/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "@/app/libs/toast";
import { PublicHost, SafeUser } from "@/app/types";
import { Users, DoorOpen, Bed, ChevronDown, ChevronUp } from "lucide-react";
import type { IconComponent } from "../icons/iconType";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import { IconCar4wd, IconDashboard, IconFileDescription, IconFileInfo, IconGasStation, IconGauge, IconLogs, IconMapPin, IconQuestionMark } from "@tabler/icons-react";
import { getHostingDuration } from "@/app/helpers/getHostingDuration";
import ListingMap from "./ListingMap";
import RatingDisplay from "./RatingDisplay";
import useLoginModal from "@/app/hooks/useLoginModal";
import HostCard from "./HostCard";
import CancellationPolicyDisplay from "./CancellationPolicyDisplay";
import ListingDetails from "./ListingDetails";
import ListingHighlights from "./ListingHighlights";
import type { SafeListing } from "@/app/types";

interface ListingInfoProps {
    listingId: string;
    listing: SafeListing;
    user: PublicHost;
    currentUser?: SafeUser | null;
    description: string;
    information: string;
    guestCount: number;
    doorCount: number;
    sleepCount: number;
    year: number;
    modal: string;
    company: string;
    category: {
        icon: IconComponent;
        label: string;
        description: string;
    };
    state: string;
    suburb: string;
    address: string;
    amenities?: string[];
    fuelEconomy?: number | null;
    driveChain?: string | null;
    cancellationPolicy?: string | null;
}

interface ReviewSummary {
    average: number;
    count: number;
}

const ListingInfo: React.FC<ListingInfoProps> = ({
    listingId,
    listing,
    user,
    currentUser,
    description,
    information,
    guestCount,
    doorCount,
    sleepCount,
    year,
    modal,
    company,
    state,
    suburb,
    address,
    amenities,
    fuelEconomy,
    driveChain,
    cancellationPolicy,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({ average: 0, count: 0 });
    const [contactingHost, setContactingHost] = useState(false);
    const router = useRouter();
    const loginModal = useLoginModal();

    // Shorten the description for collapsed view
    const words = description.split(" ");
    const shortDescription = words.slice(0, 20).join(" ") + "...";

    useEffect(() => {
        axios.get(`/api/reviews/${listingId}`).then((res) => {
            const reviews: { rating: number }[] = res.data || [];
            if (reviews.length > 0) {
                const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                setReviewSummary({ average, count: reviews.length });
            }
        }).catch(() => { /* no reviews yet */ });
    }, [listingId]);

    // Calculate hosting duration from user's earliest listing createdAt date
    const hostingSinceLabel = useMemo(() => {
        const listings = user?.listings || [];
        if (listings.length === 0) {
            return "No listings yet";
        }
        const earliestListing = listings.reduce((earliest, current) =>
            new Date(current.createdAt) < new Date(earliest.createdAt)
                ? current
                : earliest
        );
        return getHostingDuration(new Date(earliestListing.createdAt));
    }, [user]);

    let fuelEconomyLabel = "";
    if (fuelEconomy !== null && fuelEconomy !== undefined) {
        if (fuelEconomy < 8) {
            fuelEconomyLabel = "* This vehicle is fuel-efficient, saving you money on long trips.";
        } else if (fuelEconomy >= 8 && fuelEconomy <= 13) {
            fuelEconomyLabel = "* A balanced fuel economy, offering a smooth and reliable ride.";
        } else {
            fuelEconomyLabel = "* Strong performance with decent fuel usage for power and speed.";
        }
    }

    const isOwnListing = currentUser?.id === user?.id;

    const onContactHost = async () => {
        if (!currentUser) {
            return loginModal.onOpen();
        }
        setContactingHost(true);
        try {
            const res = await axios.post('/api/chats', { userId: user.id });
            router.push(`/messages/${res.data.id}`);
        } catch {
            toast.error('Failed to start conversation');
        } finally {
            setContactingHost(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <RatingDisplay rating={reviewSummary.average} reviewCount={reviewSummary.count} />
            {reviewSummary.count > 0 && <hr className="border-hairline-soft" />}

            <CancellationPolicyDisplay value={cancellationPolicy} />
            <hr className="border-hairline-soft" />

            {/* Basic Details */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 md:gap-4 text-ink">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Users size={18} /> {guestCount} guests
                    </div>
                    <div className="h-5 w-[1px] bg-hairline"></div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <DoorOpen size={18} /> {doorCount} doors
                    </div>
                    <div className="h-5 w-[1px] bg-hairline"></div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <Bed size={18} /> {sleepCount} sleeps
                    </div>
                </div>
            </div>
            <hr className="border-hairline-soft" />

            <ListingHighlights listing={listing} />

            {/* Build Information */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-3 items-center text-ink">
                    <IconDashboard size={18} />
                    <div className="text-body-md font-medium">Basic Information</div>
                </div>
                <div className="ml-7 text-xl font-medium text-ink">
                    {company} {modal} {year}
                </div>
            </div>
            <hr className="border-hairline-soft" />

            {/* Description Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between cursor-pointer text-ink">
                    <div className="flex flex-row gap-3 items-center">
                        <IconFileDescription size={20} />
                        <span className="text-body-md font-medium">Description</span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-muted hover:text-ink transition"
                    >
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                </div>
                <div
                    className={`ml-7 overflow-hidden text-body-md text-body whitespace-pre-line transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[500px]" : "max-h-[50px]"}`}
                >
                    {isExpanded ? description : shortDescription}
                </div>
            </div>
            <hr className="border-hairline-soft" />

            {/* Fuel Economy Section */}
            {fuelEconomy !== null && fuelEconomy !== undefined && (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-row gap-3 items-center text-ink">
                            <IconGasStation size={18} />
                            <div className="text-body-md font-medium">Fuel Economy</div>
                        </div>
                        <div className="ml-7 text-body-md text-ink"><span>{fuelEconomy}</span> L/100km</div>
                    </div>
                    <div className="ml-7 text-sm text-muted">{fuelEconomyLabel}</div>
                </div>
            )}

            {/* Drive Chain Section */}
            {driveChain && driveChain !== "NA" && (
                <div>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-row gap-3 items-center text-ink">
                            <IconCar4wd size={16} />
                            <div className="text-body-md font-medium">Drive Chain</div>
                        </div>
                        <div className="ml-7 text-body-md text-ink"><span>{driveChain}</span></div>
                    </div>
                    <hr className="mt-8 border-hairline-soft" />
                </div>
            )}

            {/* Location Information */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-3 items-center text-ink">
                    <IconMapPin size={18} />
                    <div className="text-body-md font-medium">Location</div>
                </div>
                <div className="ml-7 text-body-md text-ink">{address}</div>
                <div className="ml-7 mt-2">
                    <ListingMap suburb={suburb} state={state} />
                </div>
            </div>
            <hr className="border-hairline-soft" />

            {/* Additional Information */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-3 items-center text-ink">
                    <IconFileInfo size={18} />
                    <div className="text-body-md font-medium">Information</div>
                </div>
                <div className="ml-7 text-body-md text-body overflow-clip whitespace-pre-line">{information}</div>
            </div>
            <hr className="border-hairline-soft" />

            {/* Amenities */}
            <div>
                <div className="flex flex-row items-center gap-3 text-ink">
                    <IconLogs size={18} />
                    <div className="text-body-md font-medium">Amenities</div>
                </div>
                {amenities && amenities.length > 0 ? (
                    <div className="ml-7 mt-4 grid grid-cols-1 sm:grid-cols-2">
                        {amenities.map((amenity) => {
                            const amenityData = AMENITIES_LIST.find((a) => a.id === amenity);
                            const IconComponent = amenityData?.icon || IconQuestionMark;

                            return (
                                <div key={amenity} className="flex items-center gap-4 py-3 border-b border-hairline-soft">
                                    <IconComponent size={24} stroke={2} className="text-ink" />
                                    <span className="text-body-md text-ink">{amenityData?.name || amenity}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="ml-7 mt-4 text-muted">No amenities available for this listing.</p>
                )}
            </div>
            <hr className="border-hairline-soft" />

            <ListingDetails listing={listing} />

            <HostCard
                user={user}
                hostingSinceLabel={hostingSinceLabel}
                isOwnListing={isOwnListing}
                contactingHost={contactingHost}
                onContactHost={onContactHost}
            />
        </div>
    );
};

export default ListingInfo;
