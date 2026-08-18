import SkeletonCard from "./components/SkeletonCard";

const Loading = () => {
  return (
    <div className="mx-auto max-w-[2520px] px-4 pb-8 pt-6 sm:px-6 sm:pt-10 md:px-10 lg:pt-12 xl:px-20" role="status" aria-label="Loading vehicles">
      <div className="mb-7"><div className="h-3 w-32 skeleton-wave rounded" /><div className="mt-3 h-9 w-full max-w-lg skeleton-wave rounded" /><div className="mt-2 h-4 w-full max-w-md skeleton-wave rounded" /></div>
      <div className="mb-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="w-[238px] shrink-0 sm:w-[260px]"><SkeletonCard compact /></div>)}
      </div>
      <div className="mb-4 h-7 w-32 skeleton-wave rounded" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <span className="sr-only">Loading available vehicles</span>
    </div>
  );
};

export default Loading;
