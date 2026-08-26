import getCurrentUser from "../actions/getCurrentUser";
import getFavoriteListings from "../actions/getFavoriteListings";
import { toListingCardData } from "../libs/listingCardData";
import FavoritesClient from "./FavoritesClient";

const FavoritesPage = async () => {
    const [listings, currentUser] = await Promise.all([
        getFavoriteListings(),
        getCurrentUser(),
    ]);

    return <FavoritesClient listings={listings.map(toListingCardData)} currentUser={currentUser} />;
};

export default FavoritesPage;
