"use client";

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeListing, SafeUser } from "@/app/types";
import ListingCard from "../components/listings/ListingCard";
import axios from "axios";
import toast from "@/app/libs/toast";
import { useState } from "react";
import DeleteModal from "../components/modals/DeleteModal"; // ✅ Import DeleteModal

interface MyUtilitiesClientProps {
    listings: SafeListing[];
    currentUser?: SafeUser | null;
}

const MyUtilitiesClient: React.FC<MyUtilitiesClientProps> = ({
    listings,
    currentUser
}) => {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsModalOpen(true); // ✅ Open modal when delete is clicked
    };

    const onDelete = () => {
        if (!deletingId) return;

        axios.delete(`/api/listings/${deletingId}`)
            .then(() => {
                toast.success("Listing deleted successfully!");
                router.refresh();
            })
            .catch((error) => {
                console.error("Delete Error:", error);
                toast.error(error?.response?.data?.error || "Error deleting listing.");
            })
            .finally(() => {
                setDeletingId(null);
                setIsModalOpen(false); // ✅ Close modal after deletion
            });
    };

    // ✅ Reset deletingId when closing the modal
    const handleCloseModal = () => {
        setDeletingId(null); // Re-enable delete button
        setIsModalOpen(false);
    };

    return (
        <Container>
          <div className="py-6 sm:py-10">
            <Heading title="My Utilities" subtitle="Manage and update your listed utilities" />
            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {listings.map((listing) => (
                    <ListingCard
                        key={listing.id}
                        data={listing}
                        currentUser={currentUser}
                        showEditButton={true}
                        actionLabel="Delete Utility"
                        onAction={() => handleDeleteClick(listing.id)}
                        disabled={deletingId === listing.id} // ✅ Re-enabled after "Go Back"
                    />
                ))}
            </div>

            {/* ✅ Delete Modal */}
            <DeleteModal
                isOpen={isModalOpen}
                onClose={handleCloseModal} // ✅ Now resets deletingId
                onDelete={onDelete}
            />
          </div>
        </Container>
    );
};

export default MyUtilitiesClient;
