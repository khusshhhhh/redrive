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
  const startDate = params?.get("startDate");
  const endDate = params?.get("endDate");
  const guestCount = params?.get("guestCount");

  const locationLabel = useMemo(() => {
    return stateValue !== "Anywhere" ? stateValue : "Anywhere";
  }, [stateValue]);

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
      startDate ||
      endDate ||
      guestCount
    );
  }, [stateValue, startDate, endDate, guestCount]);

  // Handler to clear filters by navigating to the base route without query parameters
  const handleClearFilters = () => {
    router.push("/");
  };

  return (
    <div className="flex min-w-0 flex-row items-center gap-2 sm:gap-4">
      <div
        onClick={searchModal.onOpen}
        className="min-w-0 flex-1 cursor-pointer rounded-full border border-hairline bg-white py-1.5 text-ink shadow-card transition hover:shadow-md sm:py-2 md:w-auto md:flex-none"
      >
        <div className="flex min-w-0 flex-row items-center justify-between sm:gap-4 md:gap-10">
          {/* Selected Location */}
          <div className="truncate px-3 text-caption font-medium sm:px-5 md:px-6">{locationLabel}</div>

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
      <div>
        {filtersApplied && (
          <div className="text-center">
            <button
              onClick={handleClearFilters}
              className="p-3 bg-white text-ink rounded-full border border-hairline hover:border-ink transition"
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
