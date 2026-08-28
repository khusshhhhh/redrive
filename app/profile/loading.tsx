import { Skeleton, SkeletonScope } from "../components/Skeleton";

export default function Loading() {
  return (
    <SkeletonScope>
      <main className="bg-surface-soft/40 px-4 py-10 sm:px-6" role="status" aria-label="Loading profile">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-9 max-w-md space-y-3">
            <Skeleton width={208} height={32} />
            <Skeleton width={320} height={16} />
          </div>
          <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
            <div className="rounded-md border border-hairline-soft bg-white p-6">
              <Skeleton circle width={112} height={112} containerClassName="mx-auto block w-28 leading-none" />
              <Skeleton width={144} height={20} className="mt-5" containerClassName="mx-auto block w-36 leading-none" />
              <Skeleton width={192} height={12} className="mt-3" containerClassName="mx-auto block w-48 leading-none" />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-md border border-hairline-soft bg-white p-8">
                  <Skeleton width={176} height={24} />
                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <Skeleton height={56} />
                    <Skeleton height={56} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </SkeletonScope>
  );
}
