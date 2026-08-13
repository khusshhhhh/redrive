'use client';

import { useCallback, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";

interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title?: string;
    body?: React.ReactElement;
    footer?: React.ReactElement;
    actionLabel: string;
    disabled?: boolean;
    loading?: boolean;
    secondaryAction?: () => void;
    secondaryActionLabel?: string;
    compact?: boolean;
}

const Modal: React.FC<ModalProps> = ({
    isOpen = false,
    onClose,
    onSubmit,
    title,
    body,
    footer,
    actionLabel,
    disabled = false,
    loading = false,
    secondaryAction,
    secondaryActionLabel,
    compact = false,
}) => {
    const [showModal, setShowModal] = useState(isOpen);

    // Sync `showModal` state with `isOpen` prop
    useEffect(() => {
        if (isOpen) {
            setShowModal(true);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        } else {
            setTimeout(() => setShowModal(false), 300); // Smooth transition
            document.body.style.overflow = ''; // Re-enable background scrolling
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (disabled) return;

        setShowModal(false);
        setTimeout(onClose, 300);
    }, [disabled, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, handleClose]);

    const handleSubmit = useCallback(() => {
        if (!disabled) {
            onSubmit();
        }
    }, [disabled, onSubmit]);

    const handleSecondaryAction = useCallback(() => {
        if (!disabled && secondaryAction) {
            secondaryAction();
        }
    }, [disabled, secondaryAction]);

    if (!isOpen && !showModal) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/40 backdrop-blur-[2px] outline-none sm:items-center ${compact ? "" : "overflow-y-auto"}`}
            onClick={handleClose} // Close when clicking outside
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className={compact
                    ? "relative w-full sm:max-w-[440px] sm:px-4 sm:py-6"
                    : "relative w-full sm:w-11/12 md:w-4/6 lg:w-3/6 xl:w-2/5 my-6 mx-auto h-[95%] px-4"}
                onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
            >
                {/* Modal Content */}
                <div
                    className={`transition-transform duration-300 h-full 
          ${showModal ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                >
                    <div className={`relative flex w-full flex-col bg-white outline-none overflow-hidden ${compact ? "max-h-[92dvh] rounded-t-2xl shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:rounded-2xl" : "h-full border-0 rounded-md shadow-card lg:h-auto md:h-auto"}`}>

                        {/* Modal Header */}
                        <div className={`relative flex items-center justify-center bg-white top-0 z-10 ${compact ? "px-6 pb-3 pt-6 sm:pt-7" : "p-6 border-b border-hairline-soft"}`}>
                            <button onClick={handleClose} aria-label="Close dialog" className={`absolute z-20 rounded-full border-0 transition text-muted hover:bg-surface-soft hover:text-ink ${compact ? "right-4 top-4 p-2" : "left-4 p-1"}`}>
                                <IoMdClose size={compact ? 20 : 18} />
                            </button>
                            <div id="modal-title" className={`${compact ? "text-xl" : "text-title-md"} font-semibold text-ink px-10 text-center truncate`}>{title}</div>
                        </div>

                        {/* Modal Body */}
                        <div className={`relative flex-auto overflow-y-auto text-ink ${compact ? "px-5 pb-2 pt-3 sm:px-7" : "p-6 max-h-[70vh]"}`}>{body}</div>

                        {/* Modal Footer */}
                        <div className={`flex flex-row items-center gap-4 w-full bg-white sticky bottom-0 z-10 ${compact ? "px-5 pb-2 pt-2 sm:px-7" : "px-6 border-t border-hairline-soft"}`}>
                            {secondaryAction && secondaryActionLabel && (
                                <Button outline disabled={disabled} label={secondaryActionLabel} onClick={handleSecondaryAction} />
                            )}
                            <Button disabled={disabled} loading={loading} label={actionLabel} onClick={handleSubmit} />
                        </div>

                        {/* Extra Footer (if provided) */}
                        {footer}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
