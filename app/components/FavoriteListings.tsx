import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";
import HorizontalScroller from "./HorizontalScroller";
import { SafeListing, SafeUser } from "../types";
import { toListingCardData } from "../libs/listingCardData";

interface FavoriteListingsProps {
  listings: SafeListing[];
  currentUser?: SafeUser | null;
}

const FavoriteListings: React.FC<FavoriteListingsProps> = ({
  listings,
  currentUser,
}) => {
  if (!currentUser || listings.length === 0) {
    return null;
  }

  return (
    <section className="bg-white mt-12" aria-labelledby="favorite-listings-heading">
      <div id="favorite-listings-heading">
        <Heading title="Your Favorites" subtitle="Vehicles you have saved" />
      </div>
      <HorizontalScroller
        ariaLabel="Favourite vehicles"
        className="mt-4 gap-6 pb-2"
      >
        {listings.map((listing) => (
          <div key={listing.id} className="w-[calc((100vw-3.25rem)/2)] min-w-[148px] max-w-[220px] shrink-0 snap-start sm:w-[220px]">
            <ListingCard currentUser={currentUser} data={toListingCardData(listing)} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
};

export default FavoriteListings;
