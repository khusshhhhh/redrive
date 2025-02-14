'use client';

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeListing, SafeUser } from "@/app/types";
import ListingCard from "../components/listings/ListingCard";

interface MyUtilitiesClientProps {
    listings: SafeListing[];
    currentUser?: SafeUser | null;
}

const MyUtilitiesClient: React.FC<MyUtilitiesClientProps> = ({
    listings,
    currentUser
}) => {
    const router = useRouter();

    return (
        <Container>
            <Heading
                title="My Utilities"
                subtitle="Manage and update your listed utilities"
            />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-8">
                {listings.map((listing) => (
                    <ListingCard
                        key={listing.id}
                        data={listing}
                        currentUser={currentUser}
                        showEditButton={true} // ✅ Show Edit Button only here
                        actionLabel="Delete Utility"
                        onAction={(id) => {
                            if (confirm("Are you sure you want to delete this utility?")) {
                                router.push(`/api/listings/${id}/delete`);
                            }
                        }}
                    />
                ))}
            </div>
        </Container>
    );
};

export default MyUtilitiesClient;
