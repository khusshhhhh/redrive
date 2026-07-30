"use client";

import Modal from "./Modal";

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onDelete }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onDelete}
            secondaryAction={onClose}
            secondaryActionLabel="Go back"
            actionLabel="Delete"
            title="Are you sure?"
            body={<p className="text-body text-center">This action cannot be undone.</p>}
        />
    );
};

export default DeleteModal;
