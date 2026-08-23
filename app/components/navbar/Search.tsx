"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import qs from "query-string";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInDays } from "date-fns";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import useSearchModal from "@/app/hooks/useSearchModal";
import { IconX } from "@tabler/icons-react";

interface SearchProps {
  compact?: boolean;
  isHome?: boolean;
}

const Search = ({ compact = false, isHome = false }: SearchProps) => {
  const router = useRouter();
  const params = useSearchParams();
  const searchModal = useSearchModal();

  // Retrieve filters from URL params
  const stateValue = params?.get("state") || "Anywhere";
  const suburbValue = params?.get("suburb");
  const startDate = params?.get("startDate");
  const endDate = params?.get("endDate");
  const guestCount = params?.get("guestCount");

  const locationLabel = useMemo(() => {
    if (suburbValue && stateValue !== "Anywhere") return `${suburbValue}, ${stateValue}`;
    if (suburbValue) return suburbValue;
    return stateValue !== "Anywhere" ? stateValue : "Anywhere";
  }, [stateValue, suburbValue]);

  const durationLabel = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let diff = differenceInDays(end, start);
      if (diff === 0) diff = 1;
      return `${diff} Days`;
    }
    return "Any Week";
  }, [startDate, endDate]);

  const guestLabel = useMemo(() => {
    return guestCount ? `${guestCount} Guests` : "Add Guests";
  }, [guestCount]);

  // Determine if any filter is applied
  const filtersApplied = useMemo(() => {
    return (
      (stateValue && stateValue !== "Anywhere") ||
      suburbValue ||
      startDate ||
      endDate ||
      guestCount
    );
  }, [stateValue, suburbValue, startDate, endDate, guestCount]);

  // Handler to clear filters by navigating to the base route without query parameters
  const handleClearFilters = () => {
    router.push("/");
  };

  return (
    <div className="relative flex min-w-0 flex-row items-center justify-center">
      <button
        type="button"
        onClick={searchModal.onOpen}
        aria-label={`Search vehicles. ${locationLabel}, ${durationLabel}, ${guestLabel}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink shadow-card outline-none transition-[background-color,border-color,box-shadow] duration-300 ease-out hover:border-border-strong hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none md:hidden"
      >
        <BiSearch size={22} aria-hidden="true" />
        {filtersApplied && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-white" aria-hidden="true" />
        )}
      </button>
      <div
        onClick={searchModal.onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); searchModal.onOpen(); } }}
        aria-label={`Search vehicles. ${locationLabel}, ${durationLabel}, ${guestLabel}`}
        className={`hidden min-w-0 cursor-pointer rounded-full border border-hairline bg-white text-ink shadow-card outline-none transition-[width,height,box-shadow] duration-300 ease-out hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none md:block ${isHome && !compact ? "h-14 w-[min(600px,46vw)]" : "h-12 w-[min(480px,41vw)]"}`}
      >
        <div className="grid h-full min-w-0 grid-cols-3 items-center">
          {/* Selected Location */}
          <div className={`min-w-0 transition-[padding] duration-300 ${isHome && !compact ? "px-5" : "px-4"}`}>
            {isHome && !compact && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Where</div>}
            <div className={`truncate font-medium ${isHome && !compact ? "text-sm" : "text-[13px]"}`}>{locationLabel}</div>
          </div>

          {/* Date Range */}
          <div className={`min-w-0 border-x border-hairline text-left font-medium ${isHome && !compact ? "px-5 text-sm" : "px-4 text-[13px]"}`}>
            {isHome && !compact && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">When</div>}
            <div className="truncate">{durationLabel}</div>
          </div>

          {/* Guest Count */}
          <div className={`relative min-w-0 font-medium ${isHome && !compact ? "pl-5 pr-14 text-sm" : "pl-4 pr-12 text-[13px]"}`}>
            <div className="min-w-0">
              {isHome && !compact && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Who</div>}
              <div className="truncate">{guestLabel}</div>
            </div>
            <div className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-[width,height] duration-300 ${isHome && !compact ? "h-10 w-10" : "h-8 w-8"}`}>
              <BiSearch size={isHome && !compact ? 20 : 18} />
            </div>
          </div>
        </div>
      </div>
      {/* Show Clear Filters button only if a filter is applied */}
      <div className="absolute left-full top-1/2 ml-4 hidden -translate-y-1/2 md:block">
        {filtersApplied && (
          <div className="text-center">
            <button
              onClick={handleClearFilters}
              aria-label="Clear all search filters"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink transition hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <IconX size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
