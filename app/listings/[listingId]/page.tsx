import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getReservationDateRanges from "@/app/actions/getReservationDateRanges";
import type { Metadata } from "next";
import { buildSeoMetadata } from "@/app/libs/seo";

type ListingPageProps = { params: Promise<{ listingId: string }> };

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
    const { listingId } = await params;
    const listing = await getListingById({ listingId });
    if (!listing) return { title: "Vehicle not found", robots: { index: false, follow: false } };

    const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
    const description = `${listing.title} in ${location || "Australia"}. ${listing.description}`.replace(/\s+/g, " ").trim().slice(0, 158);

    return buildSeoMetadata({
        title: `${listing.title} — ${listing.category} in ${location || "Australia"}`,
        description,
        path: `/listings/${listing.id}`,
        image: listing.imageSrcs?.[0],
        imageAlt: `${listing.title}, a ${listing.category.toLowerCase()} available through Redrive in ${location || "Australia"}`,
        keywords: [`${listing.category} hire`, `${listing.category} hire ${listing.suburb}`, `vehicle hire ${listing.state}`],
        category: listing.category,
    });
}

const ListingPage = async ({ params }: ListingPageProps) => {
    // Await params to ensure they are resolved before use
    const resolvedParams = await params;

    if (!resolvedParams || !resolvedParams.listingId) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    const { listingId } = resolvedParams;

    const listing = await getListingById({ listingId });
    const reservations = await getReservationDateRanges(listingId);
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
