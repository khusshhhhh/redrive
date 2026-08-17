import Heading from "./Heading";
import ListingCard from "./listings/ListingCard";
import { SafeListing, SafeUser } from "../types";

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
      <div className="mt-4 flex flex-row gap-6 overflow-x-auto scrollbar-hide pb-2">
        {listings.map((listing) => (
          <div key={listing.id} className="w-[220px] shrink-0">
            <ListingCard currentUser={currentUser} data={listing} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FavoriteListings;
