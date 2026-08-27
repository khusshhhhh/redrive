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
                className={`w-full py-2 font-medium rounded-sm transition flex items-center justify-center gap-2
                ${disabled || loading ? "bg-surface-strong text-muted cursor-not-allowed" :
                        variant === "primary"
                            ? "bg-white text-ink border border-ink hover:bg-ink hover:text-white"
                            : "bg-white text-error border border-error hover:bg-error hover:text-white"}
            `}
            >
                {loading && (
                    <DotLoader
                        size="sm"
                        color={variant === "primary" ? "#3B3B3B" : "#C0281B"}
                    />
                )}
                {loading ? "Loading..." : label}
            </button>
        </div>
    );
};

export default ListingCardButton;
