import React from "react";

const Loading = () => (
  <div className="max-w-screen-2xl px-10 mx-auto md:mx-10 animate-pulse space-y-6">
    <div className="h-80 bg-surface-soft rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-3 md:gap-10">
      <div className="md:col-span-2 space-y-4">
        <div className="h-6 bg-surface-soft rounded w-1/3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-surface-soft rounded" />
        ))}
      </div>
      <div className="md:col-span-1 space-y-4 mt-6 md:mt-0">
        <div className="h-64 bg-surface-soft rounded" />
        <div className="h-10 bg-surface-soft rounded" />
      </div>
    </div>
  </div>
);

export default Loading;
