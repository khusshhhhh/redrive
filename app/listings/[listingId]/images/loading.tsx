import React from "react";

const Loading = () => (
  <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 md:px-10 xl:px-20">
    <div className="h-8 shimmer rounded w-32" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 shimmer rounded-lg" />
      ))}
    </div>
  </div>
);

export default Loading;
