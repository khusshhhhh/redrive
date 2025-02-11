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
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
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
  secondaryAction,
  secondaryActionLabel
}) => {
  const [showModal, setShowModal] = useState(isOpen);

  // Sync `showModal` state with `isOpen` prop
  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
    } else {
      setTimeout(() => setShowModal(false), 300); // Smooth transition
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;

    setShowModal(false);
    setTimeout(onClose, 300);
  }, [disabled, onClose]);

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
      className="fixed inset-0 z-51 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-neutral-800/70 outline-none"
      onClick={handleClose} // Close when clicking outside
    >
      <div
        className="relative w-full md:w-4/6 lg:w-3/6 xl:w-2/5 my-6 mx-auto h-full lg:h-auto md:h-auto"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        {/* Modal Content */}
        <div
          className={`transition-transform duration-300 h-full 
          ${showModal ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        >
          <div className="relative flex flex-col w-full h-full lg:h-auto md:h-auto bg-white border-0 rounded-lg shadow-lg outline-none">

            {/* Modal Header */}
            <div className="relative flex items-center justify-center p-6 border-b">
              <button onClick={handleClose} className="absolute left-9 p-1 border-0 hover:opacity-70 transition">
                <IoMdClose size={18} />
              </button>
              <div className="text-lg font-semibold">{title}</div>
            </div>

            {/* Modal Body */}
            <div className="relative p-6 flex-auto">{body}</div>

            {/* Modal Footer */}
            <div className="flex flex-row items-center gap-4 p-6 w-full border-t">
              {secondaryAction && secondaryActionLabel && (
                <Button outline disabled={disabled} label={secondaryActionLabel} onClick={handleSecondaryAction} />
              )}
              <Button disabled={disabled} label={actionLabel} onClick={handleSubmit} />
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
