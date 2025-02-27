"use client";

import { useState } from "react";
import { IconType } from "react-icons";
import { ImSpinner2 } from "react-icons/im"; // Import a spinner icon

interface ButtonProps {
    label: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    disabled?: boolean;
    outline?: boolean;
    small?: boolean;
    icon?: IconType;
    type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    disabled,
    outline,
    small,
    icon: Icon
}) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        setLoading(true);
        try {
            if (onClick) {
                await onClick(e);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            className={`relative flex items-center justify-center gap-2 my-4 mx-4 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg hover:opacity-80 transition w-full
                ${outline ? 'bg-white' : 'bg-teal-500'}
                ${outline ? 'border-black' : 'border-teal-500'}
                ${outline ? 'text-black' : 'text-white'}
                ${small ? 'py-1 text-sm font-light border-[1px]' : 'py-3 text-md font-semibold border-2'}`}
        >
            {loading ? (
                <ImSpinner2 size={20} className="animate-spin" />
            ) : Icon ? (
                <Icon size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2" />
            ) : null}
            {loading ? "Processing..." : label}
        </button>
    );
};

export default Button;
