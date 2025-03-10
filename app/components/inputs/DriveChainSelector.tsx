"use client";

import { FieldErrors, FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface DriveChainSelectorProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    setValue: UseFormSetValue<FieldValues>;
    watch?: UseFormWatch<FieldValues>;
    errors: FieldErrors;
}

const DRIVE_CHAIN_OPTIONS = ["Front Wheel Drive", "Rear Wheel Drive", "All Wheel Drive", "4x4", "NA"];

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
            <label className="text-md text-neutral-500 mb-2 block">{label}</label>
            <div className="grid grid-cols-2 gap-4">
                {DRIVE_CHAIN_OPTIONS.map((driveChain) => (
                    <button
                        key={driveChain}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDriveChainSelection(driveChain)}
                        className={`flex-1 py-3 px-4 text-center rounded-md transition
                            ${selectedDriveChain === driveChain ? "bg-black text-white" : "bg-gray-200 text-gray-700"}
                            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-black hover:text-white"}`}
                    >
                        {driveChain}
                    </button>
                ))}
            </div>

            {errors[id] && (
                <p className="text-red-500 text-sm mt-1">
                    {label} is required
                </p>
            )}
        </div>
    );
};

export default DriveChainSelector;
