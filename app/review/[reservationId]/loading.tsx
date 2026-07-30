import React from "react";

const Loading = () => (
  <div className="max-w-lg mx-auto p-6 space-y-4">
    <div className="h-6 shimmer rounded w-1/2" />
    <div className="h-40 shimmer rounded" />
    <div className="h-4 shimmer rounded w-1/3" />
    <div className="h-4 shimmer rounded" />
    <div className="h-4 shimmer rounded" />
  </div>
);

export default Loading;
