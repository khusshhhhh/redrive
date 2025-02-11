'use client';

import React from "react";

interface ListingCardButtonProps {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
}

const ListingCardButton: React.FC<ListingCardButtonProps> = ({ label, onClick, disabled }) => {
    return (
        <div className="mt-4">
            <button
                onClick={onClick}
                disabled={disabled}
                className={`
                w-full py-3 text-white font-semibold rounded-lg transition
                ${disabled ? "bg-gray-400 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400"}
            `}
            >
                {label}
            </button>
        </div>

    );
};

export default ListingCardButton;
