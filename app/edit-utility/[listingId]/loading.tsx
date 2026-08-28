import { Skeleton, SkeletonScope } from "../../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <div className="mx-auto max-w-3xl space-y-4 p-6" role="status" aria-label="Loading listing editor">
      <Skeleton width="33%" height={32} containerClassName="mx-auto block w-1/3 leading-none" />
      <Skeleton count={18} height={16} />
    </div>
  </SkeletonScope>
);

export default Loading;
