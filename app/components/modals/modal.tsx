"use client";

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
  isOpen,
  onClose,
  onSubmit,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  title,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  footer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  actionLabel,
  disabled,
  secondaryAction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  secondaryActionLabel
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClose = useCallback(() => {
    if (disabled) {
      return;
    }

    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [disabled, onClose]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = useCallback(() => {
    if (disabled) {
      return;
    }

    onSubmit();
  }, [disabled, onSubmit]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSecondaryAction = useCallback(() => {
    if (disabled || !secondaryAction) {
      return;
    }

    secondaryAction();
  }, [disabled, secondaryAction]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="justufy-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none bg-neutral-800/70">
        <div className="relative w-full md:w-4/6 lg:w3/6 xl:w-2/5 my-6 mx-auto h-full lg:h-auto md:h-auto">
          {/*Conmtent*/}
          <div
            className="translate
          mt-52
          duration-300
          h-full 
          ${showModal ? 'translate-y-0' : 'trasnslate-y-full'}
          ${showModal ? 'opacity-100' : 'opacity-0'}"
          >
            <div
              className="translate h-full lg:h-auto md:h-auto border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
              {/**Header */}
              <div className="flex items-center p-6 rounded-t justify-center relative border-b-[1px]">
                <button onClick={handleClose} className="p-1 border-0 hover:opacity-70 transition absolute left-9">
                  <IoMdClose size={18} />
                </button>
                <div className="text-lg font-semibold">
                  {title}
                </div>
              </div>
              {/*Body*/}
              <div className="relative p-6 flex-auto">
                {body}
              </div>
              {/**Footer */}
              <div className="flex flex-row items-center gap-4 w-full">
                {secondaryAction && secondaryActionLabel && (
                  <Button
                    outline disabled={disabled} label={secondaryActionLabel} onClick={handleSecondaryAction}
                  />
                )}
                <Button
                  disabled={disabled} label={actionLabel} onClick={handleSubmit}
                />
              </div>
              {footer}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
