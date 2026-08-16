import React from "react";
const Loading = () => (
  <main className="bg-surface-soft/40 px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-[1120px] space-y-6">
      <div><div className="skeleton-wave h-9 w-48 rounded" /><div className="skeleton-wave mt-3 h-4 w-80 max-w-full rounded" /></div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid overflow-hidden rounded-md border border-hairline-soft bg-white md:grid-cols-[220px_1fr_auto]"><div className="skeleton-wave h-48 md:h-52" /><div className="space-y-4 p-6"><div className="skeleton-wave h-5 w-28 rounded-full" /><div className="skeleton-wave h-6 w-2/3 rounded" /><div className="skeleton-wave h-4 w-1/2 rounded" /></div><div className="hidden w-44 border-l border-hairline-soft p-5 md:block"><div className="skeleton-wave h-11 rounded" /></div></div>
      ))}
    </div>
  </main>
);

export default Loading;
