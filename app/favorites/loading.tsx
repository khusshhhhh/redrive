import Container from "../components/Container";
import FlickerLoader from "../components/FlickerLoader";

export default function FavoritesLoading() {
  return (
    <main className="min-h-[70vh] pb-16 sm:pb-20">
      <Container>
        {/* The hero keeps its shape while the shortlist loads, so the page does
            not jump the moment the saved vehicles arrive. */}
        <section className="relative mt-5 overflow-hidden rounded-xl border border-hairline bg-surface-soft px-5 py-7 sm:mt-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary-soft/80" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-accent-soft/70" aria-hidden="true" />
          <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <div className="h-8 w-52 rounded-full shimmer" />
              <div className="mt-5 h-10 max-w-xl rounded-md shimmer sm:h-12" />
              <div className="mt-4 h-5 max-w-lg rounded shimmer" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="h-20 min-w-32 rounded-lg shimmer" />
              <div className="h-20 min-w-32 rounded-lg shimmer" />
            </div>
          </div>
        </section>

        <div
          className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16"
          role="status"
          aria-live="polite"
        >
          <FlickerLoader
            size={56}
            label="Gathering your saved vehicles"
            sublabel="Bringing your shortlist together."
          />
        </div>
      </Container>
    </main>
  );
}
