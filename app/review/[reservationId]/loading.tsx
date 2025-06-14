import React from "react";

const Loading = () => (
  <div className="max-w-lg mx-auto p-6 animate-pulse space-y-4">
    <div className="h-6 bg-gray-200 rounded w-1/2" />
    <div className="h-40 bg-gray-200 rounded" />
    <div className="h-4 bg-gray-200 rounded w-1/3" />
    <div className="h-4 bg-gray-200 rounded" />
    <div className="h-4 bg-gray-200 rounded" />
  </div>
);

export default Loading;
