'use client';

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeListing, SafeUser } from "../types";
import { useCallback, useState } from "react";
import axios from "axios";
import toast from "@/app/libs/toast";
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
          <div className="py-6 sm:py-10">
            <Heading title="Utility" subtitle="List of your utilities!!" />
            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                    <p className="text-muted text-center col-span-full">No listings available.</p>
                )}
            </div>
          </div>
        </Container>
    );
};

export default PropertiesClient;
