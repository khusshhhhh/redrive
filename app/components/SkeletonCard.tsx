import React from 'react';

const SkeletonCard = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className="col-span-1">
      <div className="flex w-full flex-col gap-2" aria-hidden="true">
        <div className={`${compact ? "aspect-[4/3]" : "aspect-[3/2] md:aspect-square"} w-full skeleton-wave rounded-md`} />
        <div className="flex min-h-10 items-start justify-between gap-4"><div className="h-9 w-2/3 skeleton-wave rounded" /><div className="h-4 w-10 skeleton-wave rounded" /></div>
        <div className="h-3 w-1/2 skeleton-wave rounded" />
        <div className="h-4 w-2/5 skeleton-wave rounded" />
        <div className="h-3 w-1/3 skeleton-wave rounded" />
      </div>
    </div>
  );
};

export default SkeletonCard;
