"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { IconArrowsExchange, IconX } from "@tabler/icons-react";

import useCompareVehicles from "../hooks/useCompareVehicles";
import useLastSearch from "../hooks/useLastSearch";

const CompareTray = () => {
  const pathname = usePathname();
  const router = useRouter();
  const lastSearch = useLastSearch();
  const { vehicles, remove, clear } = useCompareVehicles();

  if (vehicles.length === 0 || pathname === "/compare") return null;

  const compare = () => {
    const params = new URLSearchParams({ ids: vehicles.map((vehicle) => vehicle.id).join(",") });
    if (lastSearch?.filters.startDate) params.set("startDate", lastSearch.filters.startDate);
    if (lastSearch?.filters.endDate) params.set("endDate", lastSearch.filters.endDate);
    router.push(`/compare?${params.toString()}`);
  };

  return (
    <aside className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-2xl rounded-md border border-hairline bg-white/95 p-3 shadow-[0_12px_40px_rgba(24,54,58,0.22)] backdrop-blur-md md:bottom-5" aria-label="Vehicle comparison tray">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden text-sm font-semibold text-ink sm:block">Compare</div>
        <div className="flex min-w-0 flex-1 gap-2">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-sm bg-surface-soft p-1.5">
              <Image src={vehicle.imageSrc} alt={`${vehicle.title} thumbnail`} width={36} height={36} className="h-9 w-9 shrink-0 rounded-sm object-cover" />
              <span className="hidden truncate text-xs font-medium text-ink sm:block">{vehicle.title}</span>
              <button type="button" onClick={() => remove(vehicle.id)} aria-label={`Remove ${vehicle.title} from comparison`} className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><IconX size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={compare} disabled={vehicles.length < 2} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-sm bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"><IconArrowsExchange size={17} /> <span>{vehicles.length < 2 ? "Add one more" : "Compare"}</span></button>
        <button type="button" onClick={clear} className="hidden text-xs font-medium text-muted hover:text-ink sm:block">Clear</button>
      </div>
    </aside>
  );
};

export default CompareTray;
