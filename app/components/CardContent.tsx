import React, { useRef, useEffect } from "react";
import { IoMdClose } from "react-icons/io"; // Import close icon from react-icons

export const Card = ({ children, className = "", onClose }) => {
    const cardRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cardRef.current && !cardRef.current.contains(event.target)) {
                onClose(); // Close the popup when clicking outside
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={cardRef} className={`relative bg-white shadow-card border border-hairline-soft rounded-md p-4 ${className}`}>
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted hover:text-ink transition"
            >
                <IoMdClose size={22} />
            </button>

            {children}
        </div>
    );
};

export const CardContent = ({ children }) => {
    return <div className="p-2">{children}</div>;
};
