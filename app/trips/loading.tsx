import React from "react";
import SkeletonCard from "../components/SkeletonCard";

const Loading = () => (
  <div className="mx-auto max-w-[2520px] space-y-6 px-4 pt-12 sm:px-2 md:px-10 xl:px-20">
    <div>
      <div className="h-8 shimmer rounded w-32" />
      <div className="h-4 shimmer rounded w-48 mt-2" />
    </div>
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

export default Loading;
