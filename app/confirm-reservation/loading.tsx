import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto p-6 space-y-4">
    <div className="h-64 w-full shimmer rounded-lg" />
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="h-4 shimmer rounded" />
    ))}
    <div className="flex flex-col sm:flex-row gap-4 mt-6">
      <div className="h-10 shimmer rounded w-full" />
      <div className="h-10 shimmer rounded w-full" />
    </div>
  </div>
);

export default Loading;
