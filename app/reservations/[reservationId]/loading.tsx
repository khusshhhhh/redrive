import React from "react";

const Loading = () => (
  <div className="max-w-3xl mx-auto py-8 animate-pulse space-y-4">
    <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
    <div className="h-40 bg-gray-200 dark:bg-neutral-700 rounded" />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-700 rounded" />
    ))}
  </div>
);

export default Loading;
