import type { SafeListing } from "@/app/types";

export type ListingCardData = Pick<
  SafeListing,
  "id" | "title" | "category" | "suburb" | "state" | "price"
> & Pick<
  SafeListing,
  "badgeValue" | "reviewAverage" | "reviewCount" | "hostVerified" | "hostResponseHours" | "instantBook"
> & {
  imageSrcs: string[];
};

/**
 * A card plus the suburb-level coordinate the /explore map view places it at.
 * `lat`/`lng` are null when the listing's suburb isn't in the geo dataset —
 * such listings still appear in the results list, just not on the map.
 */
export type ListingCardGeo = ListingCardData & {
  lat: number | null;
  lng: number | null;
};

// Client listing cards need only their cover photo and visible summary fields.
// Keeping this projection explicit prevents descriptions, secondary photos,
// amenities, exact-location fields, and registration data entering the RSC
// payload for every repeated homepage card.
export function toListingCardData(listing: SafeListing): ListingCardData {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    suburb: listing.suburb,
    state: listing.state,
    price: listing.price,
    imageSrcs: listing.imageSrcs?.length ? [listing.imageSrcs[0]] : [],
    badgeValue: listing.badgeValue,
    reviewAverage: listing.reviewAverage,
    reviewCount: listing.reviewCount,
    hostVerified: listing.hostVerified,
    hostResponseHours: listing.hostResponseHours,
    instantBook: listing.instantBook,
  };
}

