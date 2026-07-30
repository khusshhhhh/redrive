import React from "react";
import SkeletonCard from "../components/SkeletonCard";

const Loading = () => (
  <div className="pt-24 px-20 animate-pulse space-y-6">
    <div>
      <div className="h-8 bg-surface-soft rounded w-36" />
      <div className="h-4 bg-surface-soft rounded w-52 mt-2" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

export default Loading;
