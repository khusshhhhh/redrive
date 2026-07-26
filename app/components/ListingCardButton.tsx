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
                ${disabled || loading ? "bg-gray-400 dark:bg-neutral-600 cursor-not-allowed" :
                        variant === "primary"
                            ? "bg-white dark:bg-neutral-800 text-graphite dark:text-limespark border-[2px] border-limespark hover:bg-limespark hover:text-graphite"
                            : "bg-white dark:bg-neutral-800 text-red-500 border-[2px] border-red-400 hover:bg-red-400 hover:text-white"}
            `}
            >
                {loading && (
                    <DotLoader 
                        size="sm" 
                        color={variant === "primary" ? "#B6FF2E" : "#ef4444"} 
                    />
                )}
                {loading ? "Loading..." : label}
            </button>
        </div>
    );
};

export default ListingCardButton;
