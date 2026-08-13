export default function Loading() {
  return (
    <main className="bg-surface-soft/40 px-4 py-10 sm:px-6" role="status" aria-label="Loading profile">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-9 space-y-3"><div className="skeleton-wave h-9 w-52 rounded-sm" /><div className="skeleton-wave h-4 w-80 max-w-full rounded-sm" /></div>
        <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
          <div className="h-72 rounded-md border border-hairline-soft bg-white p-6"><div className="skeleton-wave mx-auto h-28 w-28 rounded-full" /><div className="skeleton-wave mx-auto mt-5 h-5 w-36 rounded" /><div className="skeleton-wave mx-auto mt-3 h-3 w-48 rounded" /></div>
          <div className="space-y-6">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="rounded-md border border-hairline-soft bg-white p-8"><div className="skeleton-wave h-6 w-44 rounded" /><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="skeleton-wave h-14 rounded-sm" /><div className="skeleton-wave h-14 rounded-sm" /></div></div>)}</div>
        </div>
      </div>
    </main>
  );
}
