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
    <div className="flex flex-row items-center gap-4">
      <div
        onClick={searchModal.onOpen}
        className="border-[1px] dark:border-neutral-600 w-full md:w-auto py-2 rounded-full shadow-sm hover:shadow-md transition cursor-pointer bg-white dark:bg-neutral-800 text-black dark:text-neutral-100"
      >
        <div className="flex flex-row gap-10 items-center justify-between">
          {/* Selected Location */}
          <div className="text-sm font-medium px-6">{locationLabel}</div>

          {/* Date Range */}
          <div className="hidden sm:block text-sm font-medium px-16 border-x-[1px] dark:border-neutral-600 flex-1 text-center">
            {durationLabel}
          </div>

          {/* Guest Count */}
          <div className="text-sm pl-6 pr-2 flex font-medium flex-row items-center gap-3">
            <div className="hidden sm:block">{guestLabel}</div>
            <div className="p-2 bg-limespark rounded-full text-graphite">
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
              className="p-3 bg-white dark:bg-neutral-800 text-black dark:text-neutral-100 rounded-full hover:border-limespark border-[1px] border-gray-800 dark:border-neutral-500 hover:bg-limespark hover:text-graphite transition"
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
