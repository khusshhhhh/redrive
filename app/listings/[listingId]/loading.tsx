import { Skeleton, SkeletonScope } from "../../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <div className="mx-auto max-w-[1080px] space-y-6 px-4 pt-8" role="status" aria-label="Loading vehicle">
      <div className="flex items-center justify-between gap-4">
        <div className="w-1/3"><Skeleton height={28} /></div>
        <div className="w-20"><Skeleton height={20} /></div>
      </div>
      <Skeleton height={480} borderRadius="1.25rem" />
      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-10">
        <div className="space-y-4 md:col-span-2">
          <div className="w-1/3"><Skeleton height={24} /></div>
          <Skeleton count={6} height={16} />
        </div>
        <div className="mt-6 space-y-4 md:col-span-1 md:mt-0">
          <Skeleton height={256} borderRadius="0.875rem" />
          <Skeleton height={40} />
        </div>
      </div>
    </div>
  </SkeletonScope>
);

export default Loading;
