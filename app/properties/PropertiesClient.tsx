'use client';

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeListing, SafeUser } from "../types";
import { useCallback, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ListingCard from "../components/listings/ListingCard";

interface PropertiesClientProps {
    listings: SafeListing[];
    currentUser?: SafeUser | null;
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({
    listings,
    currentUser
}) => {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const onDelete = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/listings/${id}`)
            .then(() => {
                toast.success('Listing deleted successfully!');
                router.refresh();
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error);
            })
            .finally(() => {
                setDeletingId('');
            });
    }, [router]);


    return (
        <Container>
            <Heading title="Utility" subtitle="List of your utilities!!" />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-8">
                {listings.length > 0 ? (
                    listings.map((listing) => (
                        <ListingCard
                            key={listing.id}
                            data={listing}
                            actionId={listing.id}
                            onAction={onDelete}
                            disabled={deletingId === listing.id} // ✅ Disable only the deleting item
                            actionLabel="Delete Utility"
                            currentUser={currentUser}
                        />
                    ))
                ) : (
                    <p className="text-gray-500 text-center col-span-full">No listings available.</p>
                )}
            </div>
        </Container>
    );
};

export default PropertiesClient;
