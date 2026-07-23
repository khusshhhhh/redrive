"use client";

import { useState } from "react";
import { IconType } from "react-icons";
import DotLoader from "./DotLoader";

interface ButtonProps {
    label?: string;
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    disabled?: boolean;
    outline?: boolean;
    small?: boolean;
    icon?: IconType | React.ComponentType<{ size?: number; className?: string }>;
    type?: "button" | "submit" | "reset";
    className?: string;
    [key: string]: unknown; // Allow additional props like data-tour
}

const Button: React.FC<ButtonProps> = ({
    label,
    children,
    onClick,
    disabled,
    outline,
    small,
    icon: Icon,
    ...props
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
            className={`relative flex items-center justify-center gap-2 my-4 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg hover:opacity-80 transition w-full
                ${outline ? 'bg-white dark:bg-neutral-800' : 'bg-teal-500'}
                ${outline ? 'border-black dark:border-neutral-400' : 'border-teal-500'}
                ${outline ? 'text-black dark:text-neutral-100' : 'text-white'}
                ${small ? 'py-1 text-sm font-light border-[1px]' : 'py-3 text-md font-semibold border-2'}`}
            {...props}
        >
            {loading ? (
                <DotLoader 
                    size={small ? "sm" : "md"} 
                    color={outline ? "#000000" : "#ffffff"} 
                />
            ) : Icon ? (
                <Icon size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2" />
            ) : null}
            {loading ? "Loading..." : (children || label)}
        </button>
    );
};

export default Button;
