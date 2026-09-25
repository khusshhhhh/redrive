import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import ClientOnly from "@/app/components/ClientOnly";
import EmptyState from "@/app/components/EmptyState";
import ListingClient from "./ListingClient";
import getReservationDateRanges from "@/app/actions/getReservationDateRanges";
import type { Metadata } from "next";
import { buildSeoMetadata } from "@/app/libs/seo";
import JsonLd from "@/app/components/seo/JsonLd";
import { guestDailyPrice } from "@/app/libs/pricing";
import { ORGANIZATION_ID, absoluteUrl, breadcrumbNode, graph } from "@/app/libs/structuredData";

type ListingPageProps = { params: Promise<{ listingId: string }> };

// Depends on the signed-in viewer and on up-to-the-second availability
// (a date booked seconds ago must not still look free), so never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
    const { listingId } = await params;
    const listing = await getListingById({ listingId });
    if (!listing) return { title: "Vehicle not found", robots: { index: false, follow: false } };

    const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
    const description = `${listing.title} for hire in ${location || "Australia"} from AU$${guestDailyPrice(listing.price)}/day, all-in. ${listing.description}`.replace(/\s+/g, " ").trim().slice(0, 158);

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

type ListingForSchema = NonNullable<Awaited<ReturnType<typeof getListingById>>>;

// Vehicle + Product in one node: Product unlocks price / rating rich results,
// Vehicle carries the specs answer engines quote ("a 2019 Toyota Hilux, manual,
// 5 seats, from $X a day in Marion SA").
function listingStructuredData(listing: ListingForSchema) {
    const url = absoluteUrl(`/listings/${listing.id}`);
    const location = [listing.suburb, listing.state].filter(Boolean).join(", ");
    const name = `${listing.year} ${listing.company} ${listing.modal}`.trim();
    const reviewCount = listing.reviewCount ?? 0;

    return graph(
        {
            "@type": ["Product", "Vehicle"],
            "@id": `${url}#vehicle`,
            name: listing.title || name,
            description: listing.description.replace(/\s+/g, " ").trim().slice(0, 500),
            url,
            image: listing.imageSrcs.slice(0, 6),
            category: listing.category,
            brand: { "@type": "Brand", name: listing.company },
            model: listing.modal,
            vehicleModelDate: String(listing.year),
            fuelType: listing.fuelType,
            ...(listing.transmission ? { vehicleTransmission: listing.transmission === "MANUAL" ? "Manual" : "Automatic" } : {}),
            ...(listing.guestCount ? { seatingCapacity: listing.guestCount } : {}),
            ...(listing.doorCount ? { numberOfDoors: listing.doorCount } : {}),
            offers: {
                "@type": "Offer",
                url,
                priceCurrency: "AUD",
                price: guestDailyPrice(listing.price),
                priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: guestDailyPrice(listing.price),
                    priceCurrency: "AUD",
                    unitCode: "DAY",
                    referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
                },
                availability: "https://schema.org/InStock",
                businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
                areaServed: location ? { "@type": "Place", name: `${location}, Australia` } : { "@type": "Country", name: "Australia" },
                seller: { "@id": ORGANIZATION_ID },
            },
            // Only emit a rating backed by real published reviews — an empty or
            // invented aggregate is a structured-data policy violation.
            ...(reviewCount > 0 && listing.reviewAverage
                ? {
                      aggregateRating: {
                          "@type": "AggregateRating",
                          ratingValue: listing.reviewAverage,
                          reviewCount,
                          bestRating: 5,
                          worstRating: 1,
                      },
                  }
                : {}),
        },
        breadcrumbNode([
            { name: "Redrive", path: "/" },
            { name: "Explore vehicles", path: "/explore" },
            ...(listing.category ? [{ name: listing.category, path: `/explore?category=${encodeURIComponent(listing.category)}` }] : []),
            { name: listing.title || name, path: `/listings/${listing.id}` },
        ]),
    );
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

    // These three reads are independent — run them together instead of waiting
    // for each in turn. (getListingById is request-memoised, so the earlier
    // generateMetadata call does not cause a second query here.)
    const [listing, reservations, currentUser] = await Promise.all([
        getListingById({ listingId }),
        getReservationDateRanges(listingId),
        getCurrentUser(),
    ]);

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    return (
        <>
            <JsonLd data={listingStructuredData(listing)} />
            <ClientOnly>
                <ListingClient
                    listing={listing}
                    reservations={reservations}
                    currentUser={currentUser}
                />
            </ClientOnly>
        </>
    );
};

export default ListingPage;
