import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getReservations from "@/app/actions/getReservations";

interface ListingPageProps {
    params: { listingId: string };
}

const ListingPage = async ({ params }: ListingPageProps) => {
    // ✅ Ensure params.listingId is always a string
    if (!params?.listingId) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    const listing = await getListingById({ listingId: params.listingId });
    const reservations = await getReservations({ listingId: params.listingId });
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
