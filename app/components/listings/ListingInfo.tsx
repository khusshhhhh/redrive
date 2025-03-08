/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useMemo } from "react";
import { SafeUser } from "@/app/types";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import { FaCheck } from "react-icons/fa";
import { BsCheckLg, BsFillPeopleFill } from "react-icons/bs";
import { GiCarDoor } from "react-icons/gi";
import { FaBed } from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import { IconQuestionMark, IconShieldCheckFilled } from "@tabler/icons-react";
import ListingMap from "./ListingMap";
import { getHostingDuration } from "@/app/helpers/getHostingDuration";

interface ListingInfoProps {
    user: SafeUser & { listings?: { createdAt: string }[] };
    description: string;
    information: string;
    guestCount: number;
    doorCount: number;
    sleepCount: number;
    year: number;
    modal: string;
    company: string;
    category: {
        icon: IconType;
        label: string;
        description: string;
    };
    state: string;
    suburb: string;
    address: string;
    amenities?: string[];
}

const ListingInfo: React.FC<ListingInfoProps> = ({
    user,
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
    amenities
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Shorten the description for collapsed view
    const words = description.split(" ");
    const shortDescription = words.slice(0, 20).join(" ") + "...";

    // Debug log to inspect listings
    console.log("User listings:", user?.listings);

    // Calculate hosting duration from user's earliest listing createdAt date
    const hostingSinceLabel = useMemo(() => {
        const listings = user?.listings || [];
        if (listings.length === 0) {
            return "No listings yet";
        }
        // Find the earliest listing date
        const earliestListing = listings.reduce((earliest, current) =>
            new Date(current.createdAt) < new Date(earliest.createdAt)
                ? current
                : earliest
        );
        return getHostingDuration(new Date(earliestListing.createdAt));
    }, [user]);


    return (
        <div className="col-span-4 flex flex-col gap-8">
            {/* Basic Details */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 md:gap-4 text-neutral-700">
                    <div className="flex items-center gap-2 md:gap-3">
                        <BsFillPeopleFill size={18} /> {guestCount} guests
                    </div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <GiCarDoor size={18} /> {doorCount} doors
                    </div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <FaBed size={18} /> {sleepCount} sleeps
                    </div>
                </div>
            </div>
            <hr />

            {/* Build Information */}
            <div>
                <div className="text-base font-medium">Build Information</div>
                <div className="text-2xl font-normal text-neutral-800">
                    {company} {modal} {year}
                </div>
            </div>
            <hr />

            {/* Description Section */}
            <div>
                <div className="flex items-center justify-between cursor-pointer">
                    <span className="font-medium text-lg">Description</span>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-600 hover:text-black transition"
                    >
                        {isExpanded ? <IoIosArrowUp size={24} /> : <IoIosArrowDown size={24} />}
                    </button>
                </div>
                <div className={`overflow-hidden transition-max-height duration-300 ease-in-out ${isExpanded ? "max-h-[500px]" : "max-h-[50px]"}`}>
                    {isExpanded ? description : shortDescription}
                </div>
            </div>
            <hr />

            {/* Location Information */}
            <div>
                <div className="font-medium text-lg">Location</div>
                <div className="text-base text-neutral-800">{address}</div>
            </div>
            <hr />

            {/* Additional Information */}
            <div>
                <div className="font-medium text-lg">Information</div>
                <div className="text-base text-neutral-800 overflow-clip">{information}</div>
            </div>
            <hr />

            {/* Amenities */}
            <div>
                <div className="font-medium text-lg">Amenities</div>
                {amenities && amenities.length > 0 ? (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {amenities.map((amenity) => {
                            const amenityData = AMENITIES_LIST.find((a) => a.id === amenity);
                            const IconComponent = amenityData?.icon || IconQuestionMark;

                            return (
                                <div key={amenity} className="flex items-center gap-4 mt-4">
                                    <IconComponent size={24} stroke={2} className="text-gray-700" />
                                    <span className="text-gray-800">{amenityData?.name || amenity}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No amenities available for this listing.</p>
                )}
            </div>

            {/* User Info */}
            <div className="bg-white shadow-none md:shadow-lg shadow-gray-600/20 rounded-xl border-[1px] border-neutral-200 p-10 my-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
                    {/* Image Block */}
                    <div className="col-span-1 md:col-span-2 flex justify-center">
                        <div className="overflow-hidden relative" style={{ width: 150, height: 150 }}>
                            <Avatar src={user?.image} size={150} />
                            <div className="absolute bottom-2 right-2">
                                {user?.profileVerified === "Y" && (
                                    <div className="bg-teal-500 text-white rounded-full p-2 flex items-center justify-center">
                                        <IconShieldCheckFilled size={24} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Information Block */}
                    <div className="col-span-1 md:col-span-3 flex flex-col gap-4">
                        <div className="flex flex-col gap-0">
                            <div className="text-base font-medium">Hosted By</div>
                            <div className="text-xl font-semibold">{user?.name}</div>
                        </div>
                        <hr />
                        <div className="flex flex-col gap-0">
                            <div className="text-base font-medium">Lives in</div>
                            <div className="text-xl font-semibold">
                                {user?.suburb}, {user?.state}
                            </div>
                        </div>
                        <hr />
                        <div className="flex flex-col gap-0">
                            <div className="text-base font-medium">Hosting since</div>
                            <div className="text-xl font-semibold">{hostingSinceLabel}</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ListingInfo;
