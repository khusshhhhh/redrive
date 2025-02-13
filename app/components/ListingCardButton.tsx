'use client';

import React from "react";

interface ListingCardButtonProps {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    variant?: "primary" | "danger"; // ✅ Choose between styles
}

const ListingCardButton: React.FC<ListingCardButtonProps> = ({ label, onClick, disabled, variant = "primary" }) => {
    return (
        <div className="mt-4">
            <button
                onClick={onClick}
                disabled={disabled}
                className={`w-full py-3 font-semibold rounded-lg transition
                ${disabled ? "bg-gray-400 cursor-not-allowed" :
                        variant === "primary"
                            ? "bg-white text-teal-500 border-[2px] border-teal-400 hover:bg-teal-400 hover:text-white"
                            : "bg-white text-red-500 border-[2px] border-red-400 hover:bg-red-400 hover:text-white"}
            `}
            >
                {label}
            </button>
        </div>
    );
};

export default ListingCardButton;
