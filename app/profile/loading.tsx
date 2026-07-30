import React from "react";

const Loading = () => (
  <div className="max-w-2xl mx-auto p-6 mt-10 space-y-6">
    <div className="h-8 shimmer rounded w-1/3 mx-auto" />
    <div className="flex flex-col items-center gap-2">
      <div className="w-[100px] h-[100px] rounded-full shimmer" />
      <div className="h-4 w-1/2 shimmer rounded" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-4 shimmer rounded" />
      ))}
    </div>
  </div>
);

export default Loading;
