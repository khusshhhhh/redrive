import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto p-6 animate-pulse space-y-4">
    <div className="h-8 bg-surface-soft rounded w-1/3 mx-auto" />
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="h-4 bg-surface-soft rounded" />
    ))}
  </div>
);

export default Loading;
