import getListings, { IListingsParams } from "./actions/getListings";
import getCurrentUser from "./actions/getCurrentUser";
import ClientOnly from "./components/ClientOnly";
import Container from "./components/Container";
import EmptyState from "./components/EmptyState";
import ListingCard from "./components/listings/ListingCard";
import SearchFilters from "./components/SearchFilters";
import SavedSearches from "./components/SavedSearches";
import QuickActions from "./components/QuickActions";
import SmartRecommendations from "./components/SmartRecommendations";
// import FeatureTour, { useFeatureTour } from "./components/FeatureTour";
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
        <div className="pt-24 space-y-6">
          {/* Quick Actions - Always visible */}
          <QuickActions currentUser={currentUser} />

          {/* Search Filters */}
          <SearchFilters 
            onFiltersChange={() => {}} // This would integrate with actual search functionality
            initialFilters={params}
          />

          {/* Saved Searches - Only for authenticated users */}
          {currentUser && (
            <SavedSearches
              currentFilters={params}
              onApplySearch={() => {}} // This would integrate with actual search functionality
            />
          )}

          {/* Smart Recommendations - Show when no active filters or few results */}
          {(!hasFilters || listings.length < 3) && (
            <SmartRecommendations
              currentUser={currentUser}
              viewedListings={[]} // This would come from user's browsing history
              favoriteListings={[]} // This would come from user's favorites
            />
          )}

          {/* Results Header */}
          {hasFilters && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {listings.length === 0 ? 'No vehicles found' : `${listings.length} vehicle${listings.length !== 1 ? 's' : ''} found`}
                  </h2>
                  {listings.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Showing results for your search criteria
                    </p>
                  )}
                </div>
                {listings.length > 0 && (
                  <div className="text-sm text-gray-500">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                  <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Explore Categories
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[
                    { name: 'Cars', count: '1,200+', color: 'bg-blue-100 text-blue-800' },
                    { name: 'Motorhomes', count: '850+', color: 'bg-green-100 text-green-800' },
                    { name: 'Boats', count: '450+', color: 'bg-cyan-100 text-cyan-800' },
                    { name: 'Bikes', count: '320+', color: 'bg-orange-100 text-orange-800' },
                    { name: 'Utes', count: '680+', color: 'bg-purple-100 text-purple-800' }
                  ].map((category) => (
                    <div
                      key={category.name}
                      className="text-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${category.color} mb-2`}>
                        {category.count}
                      </div>
                      <div className="font-medium text-gray-900">{category.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Locations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Popular Destinations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { city: 'Sydney', vehicles: '2,400+', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
                    { city: 'Melbourne', vehicles: '1,800+', image: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400' },
                    { city: 'Brisbane', vehicles: '1,200+', image: 'https://images.unsplash.com/photo-1583684646989-46b3a04fcd3d?w=400' }
                  ].map((location) => (
                    <div
                      key={location.city}
                      className="relative overflow-hidden rounded-lg cursor-pointer group"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <img
                        src={location.image}
                        alt={location.city}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                        <div className="p-4 text-white">
                          <h4 className="text-xl font-semibold">{location.city}</h4>
                          <p className="text-sm opacity-90">{location.vehicles} vehicles</p>
                        </div>
                      </div>
                    </div>
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
