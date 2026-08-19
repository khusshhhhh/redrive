"use client";

import { useState } from "react";
import { IconType } from "react-icons";
import DotLoader from "./DotLoader";

interface ButtonProps {
    label?: string;
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    disabled?: boolean;
    loading?: boolean;
    loadingLabel?: string;
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
    loading: controlledLoading = false,
    loadingLabel,
    outline,
    small,
    icon: Icon,
    className,
    ...props
}) => {
    const [pending, setPending] = useState(false);
    const loading = controlledLoading || pending;

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        setPending(true);
        try {
            if (onClick) {
                await onClick(e);
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            aria-busy={loading}
            className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm font-medium transition-all duration-200 disabled:cursor-not-allowed
                ${outline ? 'bg-white border border-ink text-ink hover:bg-surface-soft' : 'bg-primary border border-primary text-white hover:bg-primary-active'}
                ${loading ? 'opacity-90 cursor-wait' : 'disabled:opacity-70'}
                ${small ? 'my-1 h-11 py-2 text-button-sm' : 'my-2 h-12 py-3 text-button-md'}
                ${className || ''}`}
            {...props}
        >
            {loading && <span className="button-loading-sheen" aria-hidden="true" />}
            {loading ? (
                <span className="relative z-10 flex items-center gap-2 animate-loadingFadeIn">
                    <DotLoader
                        size={small ? "sm" : "md"}
                        color={outline ? "#18363A" : "#ffffff"}
                    />
                    <span>{loadingLabel || "Please wait"}</span>
                </span>
            ) : Icon ? (
                <Icon size={small ? 20 : 24} className="absolute left-4 top-1/2 transform -translate-y-1/2" />
            ) : null}
            {!loading && (children || label)}
        </button>
    );
};

export default Button;
