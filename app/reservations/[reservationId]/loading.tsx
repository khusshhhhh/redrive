import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto py-8 space-y-4">
    <div className="h-6 shimmer rounded w-1/3" />
    <div className="h-40 shimmer rounded" />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-4 shimmer rounded" />
    ))}
  </div>
);

export default Loading;
