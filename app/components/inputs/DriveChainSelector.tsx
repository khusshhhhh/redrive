"use client";

import { IconCar4wd } from "@tabler/icons-react";
import { FieldErrors, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { FaCarSide, FaRoad, FaMinusCircle } from "react-icons/fa";

interface DriveChainSelectorProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    setValue: UseFormSetValue<FieldValues>;
    watch?: UseFormWatch<FieldValues>;
    errors: FieldErrors;
}

const DRIVE_CHAIN_OPTIONS = [
    { label: "Front Wheel Drive", icon: <FaCarSide /> },
    { label: "Rear Wheel Drive", icon: <FaRoad /> },
    { label: "All Wheel Drive", icon: <IconCar4wd size={18} /> },
    { label: "4x4", icon: <IconCar4wd size={18} /> },
    { label: "NA", icon: <FaMinusCircle /> },
];

const DriveChainSelector: React.FC<DriveChainSelectorProps> = ({
    id,
    label,
    disabled,
    setValue,
    watch,
    errors,
}) => {
    const selectedDriveChain = watch ? watch(id) || "" : "";

    const handleDriveChainSelection = (driveChain: string) => {
        setValue(id, driveChain, { shouldValidate: true });
    };

    return (
        <div className="w-full">
            <label className="text-body-sm text-muted mb-2 block">{label}</label>
            <div className="grid grid-cols-2 gap-4">
                {DRIVE_CHAIN_OPTIONS.map(({ label: driveChainLabel, icon }) => (
                    <button
                        key={driveChainLabel}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDriveChainSelection(driveChainLabel)}
                        className={`flex items-center justify-center gap-2 py-3 px-4 text-center rounded-sm border transition
                            ${selectedDriveChain === driveChainLabel ? "border-ink bg-ink text-white" : "border-hairline text-ink"}
                            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-ink"}
                        `}
                    >
                        {icon} {driveChainLabel}
                    </button>
                ))}
            </div>

            {errors[id] && (
                <p className="text-error text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default DriveChainSelector;
