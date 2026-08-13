import SkeletonCard from "./components/SkeletonCard";

const Loading = () => {
  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-x-6 gap-y-9 px-4 pt-12 sm:grid-cols-2 md:px-10 lg:grid-cols-4 xl:grid-cols-5" role="status" aria-label="Loading vehicles">
      {Array.from({ length: 12 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default Loading;
