import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getReservations from "@/app/actions/getReservations";

interface ListingPageProps {
    params: { listingId?: string }; // ✅ Allow optional listingId to prevent errors
}

const ListingPage = async ({ params }: ListingPageProps) => {
    if (!params || !params.listingId) { // ✅ Ensure params exists before accessing listingId
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    const { listingId } = params; // ✅ Destructure inside the function scope

    const listing = await getListingById({ listingId });
    const reservations = await getReservations({ listingId });
    const currentUser = await getCurrentUser();

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <ListingClient
                listing={listing}
                reservations={reservations}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
};

export default ListingPage;
