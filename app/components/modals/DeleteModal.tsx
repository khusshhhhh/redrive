"use client";

import React from "react";

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg w-80 text-center">
                <h2 className="text-lg font-semibold mb-4">Are you sure?</h2>
                <p className="text-gray-600 dark:text-neutral-400 mb-6">This action cannot be undone.</p>

                <div className="flex justify-between">
                    <button
                        onClick={onDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded-md w-[48%] hover:bg-red-700 transition"
                    >
                        Delete
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-limespark text-graphite font-semibold px-4 py-2 rounded-md w-[48%] hover:opacity-90 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;
