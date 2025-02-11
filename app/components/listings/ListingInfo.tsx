'use client';

import useCountries from "@/app/hooks/useCountries";
import { SafeUser } from "@/app/types";
import { IconType } from "react-icons";
import Avatar from "../Avatar";
import { BsFillPeopleFill } from "react-icons/bs";
import { GiCarDoor } from "react-icons/gi";
import { FaBed } from "react-icons/fa";
// import ListingCategory from "./ListingCategory";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import L from "leaflet";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

const Map = dynamic(() => import('../Map'), {
    ssr: false
})

interface ListingInfoProps {
    user: SafeUser;
    description: string;
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
    locationValue: string;
}

const ListingInfo: React.FC<ListingInfoProps> = ({
    user,
    description,
    guestCount,
    doorCount,
    sleepCount,
    year,
    modal,
    company,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    category,
    locationValue
}) => {
    const { getByValue } = useCountries();
    const coordinates = getByValue(locationValue)?.latlng;

    const [isExpanded, setIsExpanded] = useState(false);

    const words = description.split(" ");
    const shortDescription = words.slice(0, 20).join(" ") + "...";

    useEffect(() => {
        // Cleanup Leaflet's map container before initializing a new one
        const mapContainer = document.getElementById("map");
        if (mapContainer) {
            L?.map?.remove?.();
        }
    }, []);

    return (
        <div className="col-span-4 flex flex-col gap-8">
            <div className="flex flex-col gap-6">
                <div className="text-xl font-semibold flex flex-row items-center gap-2">
                    <div>Hosted by {user?.name}</div>
                    <Avatar src={user?.image} />
                </div>
                <div className="flex flex-row items-center gap-4 font-regular text-neutral-700">
                    <div className="flex flex-row gap-3"><BsFillPeopleFill size={22} color="black" />{guestCount} guests</div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex flex-row gap-3"><GiCarDoor size={22} color="black" />{doorCount} doors</div>
                    <div className="h-5 w-[1px] bg-gray-600"></div>
                    <div className="flex flex-row gap-3"><FaBed size={22} color="black" />{sleepCount} sleeps</div>
                </div>
            </div>
            <hr />
            <div className="flex flex-col gap-2">
                <div className="text-base font-normal text-neutral-500">Build Information</div>
                <div className="text-2xl font-bold text-neutral-800">
                    {company} {modal} {year}
                </div>
            </div>
            {/* <hr />
            {category && (
                <ListingCategory
                    icon={category.icon}
                    label={category.label}
                    description={category.description} />
            )} */}
            <hr />
            {/* Description Section */}
            <div className="text-base font-normal text-neutral-600">
                <div className="flex items-center justify-between cursor-pointer">
                    <div className="font-bold text-lg text-black mb-2">Description</div>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-600 hover:text-black transition mb-2">
                        {isExpanded ? <IoIosArrowUp size={24} /> : <IoIosArrowDown size={24} />}
                    </button>
                </div>

                {/* Description Content with Smooth Transition */}
                <div className={`overflow-hidden transition-max-height duration-300 ease-in-out ${isExpanded ? "max-h-[500px]" : "max-h-[50px]"}`}>
                    {isExpanded ? description : shortDescription}
                </div>
            </div>
            <hr />
            <div className="mb-8">
                <Map center={coordinates} />
            </div>
        </div>
    );

};

export default ListingInfo;
