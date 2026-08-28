import { Skeleton, SkeletonScope } from "../../../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 md:px-10 xl:px-20" role="status" aria-label="Loading photos">
      <div className="w-32"><Skeleton height={32} /></div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={192} borderRadius="1.25rem" />
        ))}
      </div>
    </div>
  </SkeletonScope>
);

export default Loading;
