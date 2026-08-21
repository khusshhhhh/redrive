import getListings, { IListingsParams } from "./actions/getListings";
import getCurrentUser from "./actions/getCurrentUser";
import getFavoriteListings from "./actions/getFavoriteListings";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import FavoriteListings from "./components/FavoriteListings";
import ListingCard from "./components/listings/ListingCard";
import RecentlyViewed from "./components/RecentlyViewed";
import ContinueWhereYouLeftOff from "./components/ContinueWhereYouLeftOff";
import SavedSearchManager from "./components/SavedSearchManager";
import { differenceInCalendarDays } from "date-fns";
import BookingReadiness from "./components/BookingReadiness";
import RealRecommendations from "./components/RealRecommendations";
import PurposefulCollections from "./components/PurposefulCollections";
import { addDays, nextSaturday } from "date-fns";

interface HomeProps {
  searchParams?: IListingsParams;
}

const Home = async ({ searchParams }: HomeProps) => {
  // Ensure searchParams is awaited before using its properties.
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const params: IListingsParams = resolvedSearchParams ? { ...resolvedSearchParams } : {};
  const hasFilters = Object.values(params).some(value => value !== undefined && value !== '');
  const today = new Date();
  const weekendStart = nextSaturday(today);
  const weekendEnd = addDays(weekendStart, 1);

  const [listings, currentUser, favoriteListings, weekendListings] = await Promise.all([
    getListings(params),
    getCurrentUser(),
    getFavoriteListings(),
    hasFilters ? Promise.resolve([]) : getListings({ startDate: weekendStart.toISOString(), endDate: weekendEnd.toISOString() }),
  ]);

  const tripDays = params.startDate && params.endDate
    ? Math.max(1, differenceInCalendarDays(new Date(params.endDate), new Date(params.startDate)) + 1)
    : null;

  return (
      <Container>
        <div className="space-y-10 pb-8 pt-6 sm:pt-10 lg:space-y-12 lg:pt-12">
          {/* Results Header */}
          {hasFilters && (
            <div>
              <h2 className="text-display-sm font-semibold text-ink">
                {listings.length === 0 ? 'No vehicles found' : `${listings.length} vehicle${listings.length !== 1 ? 's' : ''} found`}
              </h2>
              {listings.length > 0 && (
                <p className="text-sm text-muted mt-1">
                  Showing results for your search criteria
                </p>
              )}
            </div>
          )}

          {currentUser && <SavedSearchManager currentFilters={params} hasFilters={hasFilters} />}
          {currentUser && <BookingReadiness currentUser={currentUser} />}

          {/* Main Content */}
          {listings.length === 0 ? (
            <EmptyState showReset />
          ) : (
            <div>
              {!hasFilters && (
                <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ready for the road</p>
                    <h1 className="text-display-lg font-semibold text-ink sm:text-display-xl">Explore vehicles across Australia</h1>
                    <p className="mt-1 text-sm text-muted">Local vehicles for daily drives, work and weekends away.</p>
                  </div>
                  <div className="hidden shrink-0 rounded-full border border-hairline bg-surface-soft px-3 py-1.5 text-xs font-semibold text-ink sm:block">
                    {listings.length} available
                  </div>
                </div>
              )}
              {!hasFilters && <PurposefulCollections listings={listings} weekendListings={weekendListings} weekendStart={weekendStart} weekendEnd={weekendEnd} currentUser={currentUser} />}
              {!hasFilters && <h2 className="mb-4 text-display-sm font-semibold text-ink">All vehicles</h2>}
              <div className="
                grid
                grid-cols-2
                sm:grid-cols-2
                md:grid-cols-3
                lg:grid-cols-4
                xl:grid-cols-5
                2xl:grid-cols-6
                gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8
              ">
                {listings.map((listing, index) => (
                  <ListingCard
                    currentUser={currentUser}
                    key={listing.id}
                    data={listing}
                    priority={index < 2}
                    tripDays={tripDays}
                  />
                ))}
              </div>

              {/* Load More Button - if there are many results */}
              {listings.length >= 20 && (
                <div className="mt-8 text-center">
                  <button className="bg-white border border-ink text-ink font-medium px-6 py-3 rounded-sm hover:bg-surface-soft transition-colors">
                    Load More Vehicles
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loaded below the stable results grid so browser-only history cannot
              push the primary content down and create layout shift. */}
          {!hasFilters && (
            <>
              <FavoriteListings
                listings={favoriteListings}
                currentUser={currentUser}
              />
              {currentUser ? (
                <ContinueWhereYouLeftOff currentUser={currentUser} />
              ) : (
                <RecentlyViewed currentUser={currentUser} />
              )}
              <RealRecommendations currentUser={currentUser} />
            </>
          )}
        </div>
      </Container>
  );
};

export default Home;
