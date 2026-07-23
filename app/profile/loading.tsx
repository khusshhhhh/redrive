import React from "react";

const Loading = () => (
  <div className="max-w-2xl mx-auto p-6 mt-10 animate-pulse space-y-6">
    <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-1/3 mx-auto" />
    <div className="flex flex-col items-center gap-2">
      <div className="w-[100px] h-[100px] rounded-full bg-gray-200 dark:bg-neutral-700" />
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-neutral-700 rounded" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-700 rounded" />
      ))}
    </div>
  </div>
);

export default Loading;
