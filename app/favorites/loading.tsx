import Container from "../components/Container";

export default function FavoritesLoading() {
  return (
    <Container>
      <div className="pb-16 pt-5 sm:pt-8">
        <div className="rounded-xl border border-hairline bg-surface-soft px-5 py-8 sm:px-10 sm:py-11">
          <div className="h-7 w-44 rounded-full shimmer" />
          <div className="mt-6 h-11 max-w-2xl rounded-md shimmer" />
          <div className="mt-3 h-5 max-w-xl rounded shimmer" />
        </div>
        <div className="mt-12 flex items-end justify-between border-b border-hairline pb-6">
          <div className="space-y-3"><div className="h-6 w-48 rounded shimmer" /><div className="h-4 w-72 max-w-[70vw] rounded shimmer" /></div>
          <div className="hidden h-11 w-40 rounded-full shimmer sm:block" />
        </div>
        <div className="mt-6 h-20 rounded-lg border border-hairline shimmer" />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square rounded-md shimmer" />)}
        </div>
      </div>
    </Container>
  );
}
