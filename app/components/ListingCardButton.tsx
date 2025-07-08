'use client';

import React, { useState } from "react";
import DotLoader from "./DotLoader";

interface ListingCardButtonProps {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    disabled?: boolean;
    variant?: "primary" | "danger"; // ✅ Choose between styles
}

const ListingCardButton: React.FC<ListingCardButtonProps> = ({ label, onClick, disabled, variant = "primary" }) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        setLoading(true);
        try {
            await onClick(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <button
                onClick={handleClick}
                disabled={disabled || loading}
                className={`w-full py-2 font-medium rounded-lg transition flex items-center justify-center gap-2
                ${disabled || loading ? "bg-gray-400 cursor-not-allowed" :
                        variant === "primary"
                            ? "bg-white text-teal-500 border-[2px] border-teal-400 hover:bg-teal-400 hover:text-white"
                            : "bg-white text-red-500 border-[2px] border-red-400 hover:bg-red-400 hover:text-white"}
            `}
            >
                {loading && (
                    <DotLoader 
                        size="sm" 
                        color={variant === "primary" ? "#14b8a6" : "#ef4444"} 
                    />
                )}
                {loading ? "Loading..." : label}
            </button>
        </div>
    );
};

export default ListingCardButton;
