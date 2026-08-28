import { Skeleton } from "./Skeleton";

/** Placeholder that mirrors a listing card while data loads. */
const SkeletonCard = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className="col-span-1" aria-hidden="true">
      <div className="flex w-full flex-col gap-2">
        <div className={compact ? "aspect-[4/3] w-full" : "aspect-[3/2] w-full md:aspect-square"}>
          <Skeleton height="100%" borderRadius="0.875rem" containerClassName="block h-full leading-none" />
        </div>
        <div className="mt-1 flex min-h-10 items-start justify-between gap-4">
          <div className="w-2/3"><Skeleton height={16} /></div>
          <div className="w-10"><Skeleton height={14} /></div>
        </div>
        <div className="w-1/2"><Skeleton height={12} /></div>
        <div className="w-2/5"><Skeleton height={14} /></div>
        <div className="w-1/3"><Skeleton height={12} /></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
