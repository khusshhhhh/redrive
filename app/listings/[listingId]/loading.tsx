import React from "react";

const Loading = () => (
  <div className="max-w-screen-2xl px-10 mx-auto md:mx-10 animate-pulse space-y-6">
    <div className="h-80 bg-gray-200 dark:bg-neutral-700 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10">
      <div className="md:col-span-4 space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-700 rounded" />
        ))}
      </div>
      <div className="md:col-span-3 space-y-4 mt-6 md:mt-0">
        <div className="h-64 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-neutral-700 rounded" />
      </div>
    </div>
  </div>
);

export default Loading;
