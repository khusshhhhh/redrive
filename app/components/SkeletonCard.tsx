'use client';

const SkeletonCard = () => {
  return (
    <div className="col-span-1">
      <div className="flex flex-col gap-2 w-full animate-pulse">
        <div className="aspect-square w-full bg-gray-300 rounded-xl" />
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-300 rounded w-1/3" />
      </div>
    </div>
  );
};

export default SkeletonCard;
