import React from "react";

const Loading = () => (
  <div className="max-w-screen-2xl mx-auto px-14 md:px-24 animate-pulse space-y-6">
    <div className="h-8 bg-gray-200 rounded w-32" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);

export default Loading;
