import getListings, { IListingsParams } from "./actions/getListings";
import getCurrentUser from "./actions/getCurrentUser";
import ClientOnly from "./components/ClientOnly";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import RecentlyViewed from "./components/RecentlyViewed";
import { headers } from "next/headers";

interface HomeProps {
  searchParams?: IListingsParams;
}

const Home = async ({ searchParams }: HomeProps) => {
  // Ensure searchParams is awaited before using its properties.
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const params: IListingsParams = resolvedSearchParams ? { ...resolvedSearchParams } : {};

  // Fallback: if no searchParams, attempt to extract from referer headers.
  if (!resolvedSearchParams) {
    const referer = (await headers()).get("referer") || "";
    const urlParams = new URLSearchParams(referer);
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  const listings = await getListings(params);
  const currentUser = await getCurrentUser();

  // Check if any filters are applied
  const hasFilters = Object.values(params).some(value => value !== undefined && value !== '');

  return (
    <ClientOnly>
      <Container>
        <div className="pt-8 space-y-12">
          {/* Recently Viewed - only for returning visitors with browsing history */}
          {!hasFilters && <RecentlyViewed currentUser={currentUser} />}

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

          {/* Main Content */}
          {listings.length === 0 ? (
            <EmptyState showReset />
          ) : (
            <div>
              <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                md:grid-cols-3
                lg:grid-cols-4
                xl:grid-cols-5
                2xl:grid-cols-6
                gap-x-4 gap-y-8
              ">
                {listings.map((listing) => (
                  <ListingCard
                    currentUser={currentUser}
                    key={listing.id}
                    data={listing}
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
        </div>
      </Container>
    </ClientOnly>
  );
};

export default Home;
