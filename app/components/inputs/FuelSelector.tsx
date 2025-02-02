"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { useState } from "react";

interface FuelSelectorProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors;
}

const FUEL_OPTIONS = ["Petrol", "Diesel", "EV", "Hybrid", "None"];

const FuelSelector: React.FC<FuelSelectorProps> = ({
    id,
    label,
    disabled,
    register,
    required,
    errors,
}) => {
    const [selectedFuel, setSelectedFuel] = useState("");

    return (
        <div className="w-full">
            <label className="text-md text-neutral-500 mb-2 block">{label}</label>
            <div className="flex gap-4">
                {FUEL_OPTIONS.map((fuel) => (
                    <button
                        key={fuel}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedFuel(fuel)}
                        className={`
                            flex-1 py-3 px-4 text-center rounded-md transition
                            ${selectedFuel === fuel ? "bg-black text-white" : "bg-gray-200 text-gray-700"}
                            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-black hover:text-white"}
                        `}
                    >
                        {fuel}
                    </button>
                ))}
            </div>

            {/* Hidden input for form submission */}
            <input
                type="hidden"
                id={id}
                value={selectedFuel}
                {...register(id, { required })}
            />
            {errors[id] && (
                <p className="text-red-500 text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default FuelSelector;
