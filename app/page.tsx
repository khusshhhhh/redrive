import Link from "next/link";
import Image from "next/image";
import getListings, { IListingsParams } from "./actions/getListings";
import getCurrentUser from "./actions/getCurrentUser";
import ClientOnly from "./components/ClientOnly";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import RecentlyViewed from "./components/RecentlyViewed";
import { headers } from "next/headers";

const EXPLORE_CATEGORIES = [
  { name: "Car" },
  { name: "Motorhomes" },
  { name: "Boats" },
  { name: "Bikes" },
  { name: "Utes" },
];

const POPULAR_DESTINATIONS = [
  { city: "Sydney", state: "NSW", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400" },
  { city: "Melbourne", state: "VIC", image: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400" },
  { city: "Brisbane", state: "QLD", image: "https://images.unsplash.com/photo-1583684646989-46b3a04fcd3d?w=400" },
];

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

          {/* Additional sections for non-filtered homepage */}
          {!hasFilters && listings.length > 0 && (
            <div className="space-y-12">
              {/* Featured Categories */}
              <div>
                <h3 className="text-display-sm font-semibold text-ink mb-4">
                  Explore Categories
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {EXPLORE_CATEGORIES.map((category) => (
                    <Link
                      key={category.name}
                      href={`/?category=${encodeURIComponent(category.name)}`}
                      className="text-center p-6 bg-surface-soft hover:bg-surface-strong rounded-md cursor-pointer transition-colors"
                    >
                      <div className="font-semibold text-ink">{category.name}</div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Locations */}
              <div>
                <h3 className="text-display-sm font-semibold text-ink mb-4">
                  Popular Destinations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {POPULAR_DESTINATIONS.map((location) => (
                    <Link
                      key={location.city}
                      href={`/?state=${location.state}`}
                      className="relative overflow-hidden rounded-md cursor-pointer group block"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <Image
                        src={location.image}
                        alt={location.city}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end">
                        <div className="p-4 text-white">
                          <h4 className="text-title-md font-semibold">{location.city}</h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </ClientOnly>
  );
};

export default Home;
