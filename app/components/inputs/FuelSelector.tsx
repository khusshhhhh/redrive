"use client";

import { FieldErrors, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { FaGasPump, FaBolt, FaLeaf } from "react-icons/fa";
import { BsFuelPumpDiesel } from "react-icons/bs";
import { IconSquareRoundedX } from "@tabler/icons-react";

interface FuelSelectorProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    setValue: UseFormSetValue<FieldValues>;
    watch?: UseFormWatch<FieldValues>; // ✅ Make watch optional to prevent undefined error
    errors: FieldErrors;
}

const FUEL_OPTIONS = [
    { label: "Petrol", icon: <FaGasPump /> },
    { label: "Diesel", icon: <BsFuelPumpDiesel /> },
    { label: "EV", icon: <FaBolt /> },
    { label: "Hybrid", icon: <FaLeaf /> },
    { label: "NA", icon: <IconSquareRoundedX size={20} /> },
];

const FuelSelector: React.FC<FuelSelectorProps> = ({
    id,
    label,
    disabled,
    setValue,
    watch,
    errors,
}) => {
    const selectedFuel = watch ? watch(id) || "" : ""; // ✅ Ensure watch is available

    const handleFuelSelection = (fuel: string) => {
        setValue(id, fuel, { shouldValidate: true }); // ✅ Update form state properly
    };

    return (
        <div className="w-full">
            <label className="text-md text-neutral-500 mb-2 block">{label}</label>
            <div className="grid grid-cols-2 gap-4">
                {FUEL_OPTIONS.map(({ label: fuelLabel, icon }) => (
                    <button
                        key={fuelLabel}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleFuelSelection(fuelLabel)}
                        className={`flex items-center justify-center gap-2 py-3 px-4 text-center rounded-md transition
                            ${selectedFuel === fuelLabel ? "bg-black text-white" : "bg-gray-200 text-gray-700"}
                            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-black hover:text-white"}
                        `}
                    >
                        {icon} {fuelLabel}
                    </button>
                ))}
            </div>

            {/* Show validation error */}
            {errors[id] && (
                <p className="text-red-500 text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default FuelSelector;
