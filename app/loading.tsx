import SkeletonCard from "./components/SkeletonCard";

const Loading = () => {
  return (
    <div className="mx-auto max-w-[2520px] px-4 pt-8 sm:px-2 md:px-10 xl:px-20" role="status" aria-label="Loading vehicles">
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
