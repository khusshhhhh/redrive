import Link from "next/link";
import Image from "next/image";
import getListings, { IListingsParams } from "./actions/getListings";
import getCurrentUser from "./actions/getCurrentUser";
import ClientOnly from "./components/ClientOnly";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import SavedSearches from "./components/SavedSearches";
import RecentlyViewed from "./components/RecentlyViewed";
// import FeatureTour, { useFeatureTour } from "./components/FeatureTour";
import { headers } from "next/headers";

const EXPLORE_CATEGORIES = [
  { name: "Car", count: "1,200+", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { name: "Motorhomes", count: "850+", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { name: "Boats", count: "450+", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" },
  { name: "Bikes", count: "320+", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  { name: "Utes", count: "680+", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
];

const POPULAR_DESTINATIONS = [
  { city: "Sydney", state: "NSW", vehicles: "2,400+", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400" },
  { city: "Melbourne", state: "VIC", vehicles: "1,800+", image: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400" },
  { city: "Brisbane", state: "QLD", vehicles: "1,200+", image: "https://images.unsplash.com/photo-1583684646989-46b3a04fcd3d?w=400" },
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
        <div className="pt-24 space-y-6">
          {/* Saved Searches - Only for authenticated users */}
          {currentUser && <SavedSearches currentFilters={params} />}

          {/* Recently Viewed - only for returning visitors with browsing history */}
          {!hasFilters && <RecentlyViewed currentUser={currentUser} />}

          {/* Results Header */}
          {hasFilters && (
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                    {listings.length === 0 ? 'No vehicles found' : `${listings.length} vehicle${listings.length !== 1 ? 's' : ''} found`}
                  </h2>
                  {listings.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
                      Showing results for your search criteria
                    </p>
                  )}
                </div>
                {listings.length > 0 && (
                  <div className="text-sm text-gray-500 dark:text-neutral-400">
                    Sorted by relevance
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          {listings.length === 0 ? (
            <EmptyState showReset />
          ) : (
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                md:grid-cols-3
                lg:grid-cols-4
                xl:grid-cols-5
                2xl:grid-cols-6
                gap-6
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
                  <button className="bg-limespark text-graphite font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-colors">
                    Load More Vehicles
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Additional sections for non-filtered homepage */}
          {!hasFilters && listings.length > 0 && (
            <div className="space-y-6">
              {/* Featured Categories */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                  Explore Categories
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {EXPLORE_CATEGORIES.map((category) => (
                    <Link
                      key={category.name}
                      href={`/?category=${encodeURIComponent(category.name)}`}
                      className="text-center p-4 bg-gray-50 dark:bg-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${category.color} mb-2`}>
                        {category.count}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-neutral-100">{category.name}</div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Locations */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                  Popular Destinations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {POPULAR_DESTINATIONS.map((location) => (
                    <Link
                      key={location.city}
                      href={`/?state=${location.state}`}
                      className="relative overflow-hidden rounded-lg cursor-pointer group block"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <Image
                        src={location.image}
                        alt={location.city}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                        <div className="p-4 text-white">
                          <h4 className="text-xl font-semibold">{location.city}</h4>
                          <p className="text-sm opacity-90">{location.vehicles} vehicles</p>
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
