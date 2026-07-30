import React from "react";

const Loading = () => (
  <div className="max-w-[1080px] px-4 mx-auto pt-8 space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div className="h-7 shimmer rounded w-1/3" />
      <div className="h-5 shimmer rounded w-20" />
    </div>
    <div className="h-[480px] shimmer rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 md:gap-10">
      <div className="md:col-span-2 space-y-4">
        <div className="h-6 shimmer rounded w-1/3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 shimmer rounded" />
        ))}
      </div>
      <div className="md:col-span-1 space-y-4 mt-6 md:mt-0">
        <div className="h-64 shimmer rounded-md" />
        <div className="h-10 shimmer rounded-sm" />
      </div>
    </div>
  </div>
);

export default Loading;
