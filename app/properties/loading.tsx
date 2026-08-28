import SkeletonCard from "../components/SkeletonCard";
import { Skeleton, SkeletonScope } from "../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <div className="mx-auto max-w-[2520px] space-y-6 px-4 pt-12 sm:px-2 md:px-10 xl:px-20" role="status" aria-label="Loading your listings">
      <div className="max-w-sm">
        <Skeleton width={144} height={28} />
        <Skeleton width={208} height={16} className="mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  </SkeletonScope>
);

export default Loading;
