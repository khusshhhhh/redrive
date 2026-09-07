import Container from "../components/Container";
import SkeletonCard from "../components/SkeletonCard";
import { Skeleton, SkeletonScope } from "../components/Skeleton";

// Matches /explore's list layout — header row with the List/Map toggle, then the
// responsive vehicle grid (grid-cols-2 → 6). The map view has its own in-pane
// loading state, so this stays list-shaped.
const Loading = () => (
  <SkeletonScope>
    <Container>
      <div className="space-y-5 pb-8 pt-6 sm:pt-10 lg:pt-12" role="status" aria-label="Loading vehicles">
        <div className="flex items-start justify-between gap-3">
          <div className="w-40">
            <Skeleton height={22} />
          </div>
          <Skeleton width={132} height={40} borderRadius={999} />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading available vehicles</span>
    </Container>
  </SkeletonScope>
);

export default Loading;
