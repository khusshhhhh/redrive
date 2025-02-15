"use client";

import { useEffect } from "react";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import useAmenities, { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import { IconQuestionMark } from "@tabler/icons-react"; // ✅ Default fallback icon

// ✅ Global icon properties for consistency
const ICON_PROPS = {
    size: 24,      // Set icon size
    stroke: 2,     // Set stroke width
    color: "black",
    className: "transition-colors duration-300 group-hover:text-white" // Default color
};

interface AmenitiesSelectorProps {
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue: (name: string, value: any) => void;
}

const AmenitiesSelector: React.FC<AmenitiesSelectorProps> = ({
    register,
    errors,
    setValue,
}) => {
    const { selectedAmenities, toggleAmenity } = useAmenities();

    useEffect(() => {
        setValue("amenities", selectedAmenities);
    }, [selectedAmenities, setValue]);

    return (
        <div className="w-full">
            <label className="text-md font-semibold text-gray-600">Select Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 mt-4">
                {AMENITIES_LIST.map((amenity) => {
                    const IconComponent = amenity.icon || IconQuestionMark; // ✅ Use Tabler Icon or fallback
                    return (
                        <button
                            key={amenity.id}
                            type="button"
                            onClick={() => toggleAmenity(amenity.id)}
                            className={`group p-4 flex items-center gap-3 border-2 rounded-md transition 
        ${selectedAmenities.includes(amenity.id)
                                    ? "bg-black text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-black hover:text-white"
                                }`}
                        >
                            <IconComponent {...ICON_PROPS} /> {/* ✅ Icon will change color on hover */}
                            <span>{amenity.name}</span>
                        </button>
                    );
                })}
            </div>
            <input
                type="hidden"
                {...register("amenities")}
                value={selectedAmenities.join(",")}
            />
            {errors.amenities && (
                <p className="text-red-500 text-sm mt-1">
                    Please select at least one amenity.
                </p>
            )}
        </div>
    );
};

export default AmenitiesSelector;
