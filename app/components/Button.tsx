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
    className,
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
            className={`relative flex items-center justify-center gap-2 my-2 disabled:opacity-70 disabled:cursor-not-allowed rounded-sm transition w-full font-medium
                ${outline ? 'bg-white border border-ink text-ink hover:bg-surface-soft' : 'bg-primary border border-primary text-white hover:bg-primary-active'}
                ${small ? 'py-2 text-button-sm h-10' : 'py-3 text-button-md h-12'}
                ${className || ''}`}
            {...props}
        >
            {loading ? (
                <DotLoader
                    size={small ? "sm" : "md"}
                    color={outline ? "#222222" : "#ffffff"}
                />
            ) : Icon ? (
                <Icon size={24} className="absolute left-4 top-1/2 transform -translate-y-1/2" />
            ) : null}
            {loading ? "Loading..." : (children || label)}
        </button>
    );
};

export default Button;
