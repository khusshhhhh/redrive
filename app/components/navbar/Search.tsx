"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import qs from "query-string";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInDays } from "date-fns";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import useSearchModal from "@/app/hooks/useSearchModal";
import { IconX } from "@tabler/icons-react";

const Search = () => {
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
    <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-4">
      <button
        type="button"
        onClick={searchModal.onOpen}
        aria-label={`Search vehicles. ${locationLabel}, ${durationLabel}, ${guestLabel}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ink outline-none transition hover:border-border-strong hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
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
        className="hidden min-w-0 flex-1 cursor-pointer rounded-full border border-hairline bg-white py-1 text-ink shadow-card outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:py-2 md:block md:w-auto md:flex-none"
      >
        <div className="flex min-w-0 flex-row items-center justify-between sm:gap-4 md:gap-10">
          {/* Selected Location */}
          <div className="min-w-0 flex-1 px-4 sm:flex-none sm:px-5 md:px-6">
            <div className="truncate text-[13px] font-semibold sm:text-caption sm:font-medium">{locationLabel}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted sm:hidden">{durationLabel} · {guestLabel}</div>
          </div>

          {/* Date Range */}
          <div className="hidden flex-1 border-x border-hairline px-6 text-center text-caption font-medium sm:block md:px-10 lg:px-16">
            {durationLabel}
          </div>

          {/* Guest Count */}
          <div className="flex flex-row items-center gap-2 pr-1.5 text-caption font-medium sm:pl-3 sm:pr-2 md:pl-6">
            <div className="hidden sm:block">{guestLabel}</div>
            <div className="p-2 bg-primary rounded-full text-white">
              <BiSearch size={18} />
            </div>
          </div>
        </div>
      </div>
      {/* Show Clear Filters button only if a filter is applied */}
      <div className="hidden md:block">
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
