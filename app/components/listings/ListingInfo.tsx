'use client';

import { useState } from "react";
import { SafeUser } from "@/app/types";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import { FaCheck } from "react-icons/fa";
import { BsFillPeopleFill } from "react-icons/bs";
import { GiCarDoor } from "react-icons/gi";
import { FaBed } from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import { IconQuestionMark } from "@tabler/icons-react";
import ListingMap from "./ListingMap";

interface ListingInfoProps {
    user: SafeUser;
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

    return (
        <div className="col-span-4 flex flex-col gap-8">
            {/* Host Information */}
            <div className="flex flex-col gap-6">
                <div className="text-xl font-semibold flex items-center gap-2">
                    <span>Hosted by {user?.name}</span>
                    <Avatar src={user?.image} />
                </div>
                {user?.profileVerified === "Y" && (
                    <div className="text-teal-500 flex items-center gap-2">
                        Verified Host <FaCheck className="text-teal-500" size={18} />
                    </div>
                )}
                {/* Basic Details */}
                <div className="flex items-center gap-4 text-neutral-700">
                    <div className="flex items-center gap-3"><BsFillPeopleFill size={22} /> {guestCount} guests</div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex items-center gap-3"><GiCarDoor size={22} /> {doorCount} doors</div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex items-center gap-3"><FaBed size={22} /> {sleepCount} sleeps</div>
                </div>
            </div>
            <hr />

            {/* Build Information */}
            <div>
                <div className="text-base font-normal text-neutral-500">Build Information</div>
                <div className="text-2xl font-bold text-neutral-800">
                    {company} {modal} {year}
                </div>
            </div>
            <hr />

            {/* Description Section */}
            <div>
                <div className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-lg">Description</span>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-600 hover:text-black transition">
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
                <div className="font-bold text-lg">Location</div>
                <div className="text-base text-neutral-800">
                    {address}
                </div>
            </div>
            <hr />

            {/* Google Map Section */}
            <ListingMap address={address} suburb={suburb} state={state} />

            <hr />

            {/* Additional Information */}
            <div>
                <div className="font-bold text-lg">Information</div>
                <div className="text-base text-neutral-800">{information}</div>
            </div>
            <hr />

            {/* Amenities */}
            <div>
                <div className="font-bold text-lg">Amenities</div>
                {amenities && amenities.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
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
        </div>
    );
};

export default ListingInfo;
