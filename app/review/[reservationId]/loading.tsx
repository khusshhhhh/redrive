import { Skeleton, SkeletonScope } from "../../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <div className="mx-auto max-w-lg space-y-4 p-6" role="status" aria-label="Loading review">
      <Skeleton width="50%" height={24} />
      <Skeleton height={160} borderRadius="0.875rem" />
      <Skeleton width="33%" height={16} />
      <Skeleton count={2} height={16} />
    </div>
  </SkeletonScope>
);

export default Loading;
