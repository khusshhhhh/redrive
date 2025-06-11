'use client';

import SkeletonCard from './SkeletonCard';

const SkeletonLoader = () => {
  return (
    <div className="px-2 pt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-8">
      {Array.from({ length: 8 }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
