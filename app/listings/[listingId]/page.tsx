import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getReservations from "@/app/actions/getReservations";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListingPage = async ({ params }: { params: any }) => {
    // Await params to ensure they are resolved before use
    const resolvedParams = await Promise.resolve(params);

    if (!resolvedParams || !resolvedParams.listingId) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    const { listingId } = resolvedParams;

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
