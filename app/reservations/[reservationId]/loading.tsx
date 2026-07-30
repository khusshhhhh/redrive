import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto py-8 animate-pulse space-y-4">
    <div className="h-6 bg-surface-soft rounded w-1/3" />
    <div className="h-40 bg-surface-soft rounded" />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-4 bg-surface-soft rounded" />
    ))}
  </div>
);

export default Loading;
