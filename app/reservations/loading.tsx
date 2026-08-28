import { Skeleton, SkeletonScope } from "../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <main className="bg-surface-soft/40 px-4 py-10 sm:px-6" role="status" aria-label="Loading reservations">
      <div className="mx-auto max-w-[1120px] space-y-6">
        <div className="max-w-md">
          <Skeleton width={192} height={32} />
          <Skeleton height={16} className="mt-3" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid overflow-hidden rounded-md border border-hairline-soft bg-white md:grid-cols-[220px_1fr_auto]">
            <div className="h-48 md:h-52">
              <Skeleton height="100%" borderRadius={0} containerClassName="block h-full leading-none" />
            </div>
            <div className="space-y-4 p-6">
              <Skeleton width={112} height={20} borderRadius={999} />
              <Skeleton width="66%" height={22} />
              <Skeleton width="50%" height={16} />
            </div>
            <div className="hidden w-44 border-l border-hairline-soft p-5 md:block">
              <Skeleton height={44} />
            </div>
          </div>
        ))}
      </div>
    </main>
  </SkeletonScope>
);

export default Loading;
