'use client';

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";

// Multiple modal stores can briefly overlap when switching dialogs (for
// example Login -> Sign up). A reference count prevents one unmount from
// restoring scrolling while another dialog is still open, and guarantees the
// original inline value is restored after the final dialog closes.
let activeScrollLocks = 0;
let previousBodyOverflow = "";

const lockPageScroll = () => {
    if (activeScrollLocks === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }
    activeScrollLocks += 1;
};

const unlockPageScroll = () => {
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);
    if (activeScrollLocks === 0) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = "";
    }
};

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
    centered?: boolean;
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
    centered = false,
}) => {
    const [showModal, setShowModal] = useState(false);

    // Sync animation state. Scroll locking has its own effect so its cleanup
    // always runs when a lazy-loaded modal is removed from the tree.
    useEffect(() => {
        if (isOpen) {
            const frame = window.requestAnimationFrame(() => setShowModal(true));
            return () => window.cancelAnimationFrame(frame);
        } else {
            setShowModal(false);
            const timer = window.setTimeout(() => setShowModal(false), 380);
            return () => window.clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        lockPageScroll();
        return unlockPageScroll;
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (disabled) return;

        setShowModal(false);
        setTimeout(onClose, 380);
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

    const modal = (
        <div
            className={`fixed inset-0 z-[100] flex justify-center overflow-x-hidden bg-black/40 backdrop-blur-[2px] outline-none transition-opacity duration-300 motion-reduce:transition-none ${centered ? "items-center" : "items-end sm:items-center"} ${showModal ? "opacity-100" : "opacity-0"} ${compact ? "" : "overflow-y-auto"}`}
            onClick={handleClose} // Close when clicking outside
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className={compact
                    ? `relative w-full sm:max-w-[480px] sm:px-4 sm:py-8 ${centered ? "max-w-[480px] px-4 py-6" : ""}`
                    : "relative mx-auto h-[100dvh] w-full p-2 sm:my-6 sm:h-[95%] sm:w-11/12 sm:px-4 md:w-4/6 lg:w-3/6 xl:w-2/5"}
                onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
            >
                {/* Modal Content */}
                <div
                    className={`h-full transition-[transform,opacity] duration-[360ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none
          ${showModal ? 'translate-y-0 opacity-100' : 'translate-y-[110%] opacity-0'}`}
                >
                    <div className={`relative flex w-full flex-col bg-white outline-none overflow-hidden ${compact ? `max-h-[94dvh] shadow-2xl sm:max-h-[calc(100dvh-64px)] sm:rounded-lg ${centered ? "rounded-lg" : "rounded-t-[28px]"}` : "h-full rounded-md border-0 shadow-card md:h-auto"}`}>
                        {!centered && <div className="absolute left-1/2 top-2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-hairline sm:hidden" aria-hidden="true" />}

                        {/* Modal Header */}
                        <div className={`relative top-0 z-10 flex items-center justify-center bg-white ${compact ? "px-8 pb-4 pt-8 sm:pt-10" : "border-b border-hairline-soft px-4 py-5 sm:p-6"}`}>
                            <button onClick={handleClose} aria-label="Close dialog" className={`absolute z-20 rounded-full border-0 transition text-muted hover:bg-surface-soft hover:text-ink ${compact ? "right-4 top-4 p-2" : "left-4 p-1"}`}>
                                <IoMdClose size={compact ? 20 : 18} />
                            </button>
                            <div id="modal-title" className={`${compact ? "text-xl" : "text-title-md"} font-semibold text-ink px-10 text-center truncate`}>{title}</div>
                        </div>

                        {/* Modal Body */}
                        <div className={`relative flex-auto overflow-y-auto overscroll-contain text-ink ${compact ? "px-5 pb-3 pt-4 sm:px-10" : "max-h-[calc(100dvh-154px)] p-4 sm:max-h-[70vh] sm:p-6"}`}>{body}</div>

                        {/* Modal Footer */}
                        <div className={`safe-bottom sticky bottom-0 z-10 flex w-full flex-col items-center gap-1 bg-white sm:flex-row sm:gap-4 ${compact ? "px-5 pt-2 sm:px-10 sm:pt-3" : "border-t border-hairline-soft px-4 pt-2 sm:px-6 sm:pt-3"}`}>
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

    return createPortal(modal, document.body);
};

export default Modal;
