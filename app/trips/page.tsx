import EmptyState from "../components/EmptyState";
import ClientOnly from "../components/ClientOnly";

import getCurrentUser from "../actions/getCurrentUser";
import getReservations from "../actions/getReservations";
import TripsClient from "./TripsClient";

// Per-user bookings — always rendered per request.
export const dynamic = "force-dynamic";

const TripsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        );
    }

    const { reservations, nextCursor } = await getReservations({
        userId: currentUser.id
    });

    if (reservations.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="No booking found!"
                    subtitle="You have no upcoming bookings." />
            </ClientOnly>
        );
    }
    return (
        <ClientOnly>
            <TripsClient
                reservations={reservations}
                currentUser={currentUser}
                nextCursor={nextCursor}
                role="guest"
            />
        </ClientOnly>
    );

};

export default TripsPage;
