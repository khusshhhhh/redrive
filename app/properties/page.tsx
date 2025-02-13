import EmptyState from "../components/EmptyState";
import ClientOnly from "../components/ClientOnly";
import getCurrentUser from "../actions/getCurrentUser";
import getListings from "../actions/getListings";
import MyUtilitiesClient from "./MyUtilitiesClient";

const MyUtilitiesPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState title="Unauthorized" subtitle="Please log in" />
            </ClientOnly>
        );
    }

    const listings = await getListings({ userId: currentUser.id });

    if (listings.length === 0) {
        return (
            <ClientOnly>
                <EmptyState title="No utilities found" subtitle="You haven't listed any utilities yet." />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <MyUtilitiesClient listings={listings} currentUser={currentUser} />
        </ClientOnly>
    );
};

export default MyUtilitiesPage;
