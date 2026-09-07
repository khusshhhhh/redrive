import { Skeleton, SkeletonScope } from "../components/Skeleton";

// Mirrors the messages shell: conversation list on the left, empty canvas on the
// right (desktop only).
const Loading = () => (
  <SkeletonScope>
    <div
      className="mx-auto flex h-full min-h-0 max-w-[1440px] overflow-hidden border-x border-hairline-soft bg-white"
      role="status"
      aria-label="Loading your messages"
    >
      <div className="flex w-full flex-col gap-1 border-r border-hairline-soft p-4 md:w-[380px]">
        <Skeleton height={40} borderRadius={999} className="mb-3" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton circle width={44} height={44} />
            <div className="flex-1 space-y-2">
              <Skeleton width="55%" height={13} />
              <Skeleton width="80%" height={11} />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-1 flex-col items-center justify-center gap-4 px-8 md:flex">
        <Skeleton circle width={80} height={80} />
        <Skeleton width={220} height={22} />
        <Skeleton width={300} height={14} />
      </div>
    </div>
    <span className="sr-only">Loading</span>
  </SkeletonScope>
);

export default Loading;
