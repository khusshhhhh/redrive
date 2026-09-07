import { Skeleton, SkeletonScope } from "../components/Skeleton";

// Matches HostFlow's intro layout (text block + illustration + CTA on the left,
// supporting panel on the right) so the guided-listing screen doesn't flash the
// generic card grid first.
const Loading = () => (
  <SkeletonScope>
    <div className="h-full overflow-y-auto" role="status" aria-label="Loading the hosting flow">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Skeleton width={150} height={26} borderRadius={999} />
            <Skeleton height={44} count={2} />
            <Skeleton width="80%" height={16} count={2} />
            <Skeleton height={220} borderRadius="1rem" className="max-w-sm" />
            <Skeleton width={168} height={56} borderRadius={999} />
          </div>
          <div className="hidden lg:block">
            <Skeleton height={360} borderRadius="1.25rem" />
          </div>
        </div>
      </div>
    </div>
    <span className="sr-only">Loading</span>
  </SkeletonScope>
);

export default Loading;
