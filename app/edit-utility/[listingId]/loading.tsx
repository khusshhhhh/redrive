import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto p-6 space-y-4">
    <div className="h-8 shimmer rounded w-1/3 mx-auto" />
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="h-4 shimmer rounded" />
    ))}
  </div>
);

export default Loading;
