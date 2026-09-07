import { Suspense } from "react";
import getListings, { getListingsPage, IListingsParams } from "../actions/getListings";
import getCurrentUser from "../actions/getCurrentUser";
import getFavoriteListings from "../actions/getFavoriteListings";
import type { SafeListing } from "../types";
import Container from "../components/Container";
import EmptyState from "../components/EmptyState";
import FavoriteListings from "../components/FavoriteListings";
import ListingCard from "../components/listings/ListingCard";
import MoreListings from "./MoreListings";
import SkeletonCard from "../components/SkeletonCard";
import RecentlyViewed from "../components/RecentlyViewed";
import ContinueWhereYouLeftOff from "../components/ContinueWhereYouLeftOff";
import SavedSearchManager from "../components/SavedSearchManager";
import { addDays, differenceInCalendarDays, nextSaturday, startOfDay } from "date-fns";
import RealRecommendations from "../components/RealRecommendations";
import PurposefulCollections from "../components/PurposefulCollections";
import { buildSeoMetadata } from "../libs/seo";
import { toListingCardData } from "../libs/listingCardData";
import { withApproxLocation } from "../libs/suburbGeoData";
import ExploreViewToggle from "../components/explore/ExploreViewToggle";
import ExploreMapView from "../components/explore/ExploreMapView";

export const metadata = buildSeoMetadata({
  title: "Explore vehicles across Australia",
  description: "Browse cars, utes, vans, campervans and other useful vehicles from local Redrive hosts for daily drives, work and Australian road trips.",
  path: "/explore",
  keywords: ["car hire Australia", "ute hire Australia", "campervan hire", "van hire", "peer-to-peer vehicle rental"],
  imageAlt: "Explore locally hosted vehicles across Australia with Redrive",
});

interface ExploreProps {
  searchParams?: IListingsParams;
}

type ExploreUser = Awaited<ReturnType<typeof getCurrentUser>>;

/** A row of card placeholders while a deferred rail resolves. */
const RailSkeleton = ({ label }: { label: string }) => (
  <section className="mt-12" aria-hidden="true">
    <div className="mb-4 h-6 w-48 rounded bg-surface-soft" aria-label={label} />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="w-[220px] shrink-0">
          <SkeletonCard compact />
        </div>
      ))}
    </div>
  </section>
);

/** Deferred: the guest's saved vehicles. Its own DB read no longer blocks the
 *  results grid from painting. */
const FavoritesRail = async ({ currentUser }: { currentUser: ExploreUser }) => {
  if (!currentUser) return null;
  const favoriteListings = await getFavoriteListings();
  return <FavoriteListings listings={favoriteListings} currentUser={currentUser} />;
};

/** Deferred: the "available this weekend / popular / work-ready" collections.
 *  The weekend availability query runs while the main grid is already visible. */
const WeekendCollections = async ({
  listings,
  currentUser,
  weekendStart,
  weekendEnd,
}: {
  listings: SafeListing[];
  currentUser: ExploreUser;
  weekendStart: Date;
  weekendEnd: Date;
}) => {
  const weekendListings = await getListings({
    startDate: weekendStart.toISOString(),
    endDate: weekendEnd.toISOString(),
  });
  return (
    <PurposefulCollections
      listings={listings}
      weekendListings={weekendListings}
      weekendStart={weekendStart}
      weekendEnd={weekendEnd}
      currentUser={currentUser}
    />
  );
};

const Explore = async ({ searchParams }: ExploreProps) => {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const params: IListingsParams = resolvedSearchParams ? { ...resolvedSearchParams } : {};
  const view = (resolvedSearchParams as Record<string, unknown> | undefined)?.view === "map" ? "map" : "list";
  const hasFilters = Object.entries(params).some(
    ([key, value]) => key !== "view" && value !== undefined && value !== "",
  );
  const today = startOfDay(new Date());
  const weekendStart = nextSaturday(today);
  const weekendEnd = addDays(weekendStart, 1);

  // Only the first page of results and the viewer block first paint. Favourites
  // and the weekend collections are deferred behind <Suspense>; further result
  // pages load on demand via <MoreListings>.
  const [firstPage, currentUser] = await Promise.all([
    getListingsPage(params),
    getCurrentUser(),
  ]);
  const listings = firstPage.listings;

  const tripDays = params.startDate && params.endDate
    ? Math.max(1, differenceInCalendarDays(new Date(params.endDate), new Date(params.startDate)) + 1)
    : null;

  if (view === "map") {
    const filterParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
      if (key === "view" || key === "cursor") continue;
      if (typeof value === "string" && value !== "") filterParams[key] = value;
    }
    const geoCards = listings.map((listing) => withApproxLocation(toListingCardData(listing)));
    // Remount the map view when the filters change (a client-side SearchModal
    // navigation re-renders this RSC but keeps the same client component
    // instance, which would otherwise hold stale results).
    const mapViewKey = Object.entries(filterParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    return (
      <Container>
        <div className="pb-10 pt-6 sm:pt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-display-sm font-semibold text-ink">
                {listings.length === 0
                  ? "No vehicles found"
                  : `${listings.length}${firstPage.nextCursor ? "+" : ""} vehicle${listings.length === 1 ? "" : "s"} on the map`}
              </h1>
              <p className="mt-1 text-sm text-muted">Pan or zoom the map, then search that area.</p>
            </div>
            <ExploreViewToggle />
          </div>
          <ExploreMapView
            key={mapViewKey}
            initialCards={geoCards}
            initialCursor={firstPage.nextCursor}
            params={filterParams}
            currentUser={currentUser}
            tripDays={tripDays}
          />
        </div>
      </Container>
    );
  }

  return (
      <Container>
        <div className="space-y-5 pb-8 pt-6 sm:pt-10 lg:space-y-12 lg:pt-12">
          {/* Results Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {hasFilters && (
                <>
                  <h2 className="text-display-sm font-semibold text-ink">
                    {listings.length === 0
                      ? 'No vehicles found'
                      : `${listings.length}${firstPage.nextCursor ? '+' : ''} vehicle${listings.length !== 1 ? 's' : ''} found`}
                  </h2>
                  {listings.length > 0 && (
                    <p className="text-sm text-muted mt-1">
                      Showing results for your search criteria
                    </p>
                  )}
                </>
              )}
            </div>
            <ExploreViewToggle />
          </div>

          {currentUser && <SavedSearchManager currentFilters={params} hasFilters={hasFilters} />}

          {/* Personalised sections, shown above the full catalogue */}
          {!hasFilters && (
            <>
              {currentUser ? (
                <ContinueWhereYouLeftOff currentUser={currentUser} />
              ) : (
                <RecentlyViewed currentUser={currentUser} />
              )}
              <RealRecommendations currentUser={currentUser} />
              <Suspense fallback={<RailSkeleton label="Your favourites" />}>
                <FavoritesRail currentUser={currentUser} />
              </Suspense>
            </>
          )}

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
                    {listings.length}{firstPage.nextCursor ? '+' : ''} available
                  </div>
                </div>
              )}
              {!hasFilters && (
                <Suspense fallback={<RailSkeleton label="Available this weekend" />}>
                  <WeekendCollections
                    listings={listings}
                    currentUser={currentUser}
                    weekendStart={weekendStart}
                    weekendEnd={weekendEnd}
                  />
                </Suspense>
              )}
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
                    data={toListingCardData(listing)}
                    priority={hasFilters && index < 2}
                    tripDays={tripDays}
                  />
                ))}
              </div>

              <MoreListings
                params={params}
                initialCursor={firstPage.nextCursor}
                currentUser={currentUser}
                tripDays={tripDays}
              />
            </div>
          )}
        </div>
      </Container>
  );
};

export default Explore;
