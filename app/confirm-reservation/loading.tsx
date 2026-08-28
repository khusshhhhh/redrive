import { Skeleton, SkeletonScope } from "../components/Skeleton";

const Loading = () => (
  <SkeletonScope>
    <main className="bg-surface-soft/40 px-4 py-10" role="status" aria-label="Loading">
      <div className="mx-auto max-w-[1120px] space-y-6">
        <div className="max-w-md"><Skeleton height={40} /></div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Skeleton height={256} borderRadius="0.875rem" />
            <Skeleton height={208} borderRadius="0.875rem" />
          </div>
          <Skeleton height={384} borderRadius="0.875rem" />
        </div>
      </div>
    </main>
  </SkeletonScope>
);

export default Loading;
