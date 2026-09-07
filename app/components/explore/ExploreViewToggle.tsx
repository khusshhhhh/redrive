"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconLayoutGrid, IconMap2 } from "@tabler/icons-react";

const AREA_KEYS = ["swLat", "swLng", "neLat", "neLng"];

/**
 * List ⇆ Map switch for /explore. Preserves the active filters in the query
 * string; drops the pagination cursor, and drops the map viewport when leaving
 * the map so a shared `?view=map` link can't leave the list silently
 * area-filtered.
 */
export default function ExploreViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "map" ? "map" : "list";

  const go = (next: "list" | "map") => {
    if (next === view) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (next === "map") {
      params.set("view", "map");
    } else {
      params.delete("view");
      AREA_KEYS.forEach((key) => params.delete(key));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white p-1"
      role="group"
      aria-label="Choose how to browse results"
    >
      {([
        { key: "list", label: "List", Icon: IconLayoutGrid },
        { key: "map", label: "Map", Icon: IconMap2 },
      ] as const).map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => go(key)}
          aria-pressed={view === key}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            view === key ? "bg-primary text-white" : "text-ink hover:bg-surface-soft"
          }`}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
