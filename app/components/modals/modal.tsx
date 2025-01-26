import { useCallback, useEffect, useState } from "react";

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
  secondaryLabel?: string;
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
  secondaryLabel,
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

  return <></>;
};

export default Modal;
