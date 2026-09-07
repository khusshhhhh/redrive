import { Skeleton, SkeletonScope } from "@/app/components/Skeleton";

// Matches the operations overview: header, a 4-up metric row, an 8-up mini-metric
// row, then two chart panels.
const Loading = () => (
  <SkeletonScope>
    <main className="px-4 py-7 sm:px-6 lg:px-9 lg:py-9" role="status" aria-label="Loading the admin dashboard">
      <div className="max-w-md space-y-2">
        <Skeleton width={140} height={12} />
        <Skeleton width={260} height={30} />
        <Skeleton width="90%" height={14} />
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={104} borderRadius="0.875rem" />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={72} borderRadius="0.75rem" />
        ))}
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.7fr)]">
        <Skeleton height={320} borderRadius="1rem" />
        <Skeleton height={320} borderRadius="1rem" />
      </div>
    </main>
    <span className="sr-only">Loading</span>
  </SkeletonScope>
);

export default Loading;
