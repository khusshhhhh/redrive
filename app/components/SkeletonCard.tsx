import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="col-span-1">
      <div className="flex w-full flex-col gap-3" aria-hidden="true">
        <div className="aspect-[3/2] w-full skeleton-wave rounded-md md:aspect-square" />
        <div className="flex items-center justify-between gap-4"><div className="h-4 w-2/3 skeleton-wave rounded" /><div className="h-4 w-10 skeleton-wave rounded" /></div>
        <div className="h-3 w-1/2 skeleton-wave rounded" />
        <div className="h-3 w-1/3 skeleton-wave rounded" />
      </div>
    </div>
  );
};

export default SkeletonCard;
