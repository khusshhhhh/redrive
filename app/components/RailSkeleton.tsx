interface RailSkeletonProps {
  /** How many card placeholders to show. */
  count?: number;
  /** Card width in px — match the rail this stands in for. */
  cardWidth?: number;
  /** Reserve a strip above each card (the recommendation "reason" chip). */
  withCardMeta?: boolean;
  /** Outer spacing — rails use `mt-12`. */
  className?: string;
  label?: string;
}

/**
 * Fixed-height placeholder for a horizontally-scrolling rail of listing cards.
 * Client rails on /explore render this while their data loads so the catalogue
 * and footer below them keep their position instead of being pushed down when
 * the rail pops in. The heading and card proportions mirror <Heading> +
 * <ListingCard> (square image plus title, location and price lines) so the swap
 * to real content moves as little as possible.
 */
export default function RailSkeleton({
  count = 4,
  cardWidth = 220,
  withCardMeta = false,
  className = "mt-12",
  label = "Loading",
}: RailSkeletonProps) {
  return (
    <section className={className} role="status" aria-label={label} aria-busy="true">
      <div className="h-7 w-64 max-w-[70%] rounded bg-surface-soft sm:h-8" />
      <div className="mt-2 h-5 w-96 max-w-[85%] rounded bg-surface-soft/70" />
      <div className="mt-4 flex gap-4 overflow-hidden pb-2 sm:gap-5">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} style={{ width: cardWidth }} className="shrink-0" aria-hidden="true">
            {withCardMeta && <div className="mb-2 h-9 rounded-sm bg-surface-soft" />}
            <div className="aspect-square w-full rounded-md bg-surface-soft" />
            <div className="mt-3 h-5 w-11/12 rounded bg-surface-soft" />
            <div className="mt-2 h-4 w-2/3 rounded bg-surface-soft/70" />
            <div className="mt-3 h-4 w-1/2 rounded bg-surface-soft/70" />
            <div className="mt-2 h-3 w-3/5 rounded bg-surface-soft/60" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </section>
  );
}
