import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="col-span-1">
      <div className="flex flex-col gap-2 w-full">
        <div className="aspect-square w-full shimmer rounded-md" />
        <div className="h-4 shimmer rounded w-3/4" />
        <div className="h-3 shimmer rounded w-1/2" />
        <div className="h-3 shimmer rounded w-1/4" />
      </div>
    </div>
  );
};

export default SkeletonCard;
