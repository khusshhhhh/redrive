"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import qs from "query-string";

import type { ListingCardGeo } from "@/app/libs/listingCardData";
import type { SafeUser } from "@/app/types";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";
import { MONO_MAP_STYLES } from "@/app/libs/mapStyles";
import { clientLog } from "@/app/libs/clientLog";
import toast from "@/app/libs/toast";
import ListingCard from "@/app/components/listings/ListingCard";

interface ExploreMapViewProps {
  /** First page of results for the current filters, server-rendered. */
  initialCards: ListingCardGeo[];
  initialCursor: string | null;
  /** Active /explore filters as plain query params (no `view`, no `cursor`). */
  params: Record<string, string>;
  currentUser?: SafeUser | null;
  tripDays: number | null;
}

const PAGE_SIZE = 24;
const AU_CENTER = { lat: -25.6, lng: 134.35 };
// The one colour on the mono map: the highlighted listing's marker.
const HIGHLIGHT = "#F97316";
const PIN_STROKE = "#3F3F46";
const PIN_INK = "#1F1F1F";

interface MarkerGroup {
  position: { lat: number; lng: number };
  ids: string[];
  cards: ListingCardGeo[];
}

const groupKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const compactPrice = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "$–";
  if (value >= 1000) {
    const k = value / 1000;
    return `$${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  return `$${Math.round(value)}`;
};

const groupLabel = (group: MarkerGroup) =>
  group.cards.length > 1 ? String(group.cards.length) : compactPrice(group.cards[0]?.price ?? 0);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ExploreMapView({
  initialCards,
  initialCursor,
  params,
  currentUser,
  tripDays,
}: ExploreMapViewProps) {
  const [cards, setCards] = useState<ListingCardGeo[]>(initialCards);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchingArea, setSearchingArea] = useState(false);
  const [areaDirty, setAreaDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const googleRef = useRef<typeof google | null>(null);
  const markersRef = useRef<Map<string, { marker: google.maps.Marker; group: MarkerGroup }>>(
    new Map(),
  );
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});
  const activeIdRef = useRef<string | null>(null);
  const baselineRef = useRef<string>("");
  // The query the current `cards` reflect. Starts as the URL filters; a
  // "search this area" swaps in the viewport box and drops state/suburb.
  const activeQueryRef = useRef<Record<string, string>>({ ...params });

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const offMapCount = useMemo(
    () => cards.filter((card) => card.lat == null || card.lng == null).length,
    [cards],
  );

  const iconFor = useCallback((group: MarkerGroup, active: boolean) => {
    const g = googleRef.current;
    if (!g) return {};
    return {
      label: {
        text: groupLabel(group),
        color: active ? "#FFFFFF" : PIN_INK,
        fontSize: active ? "12px" : "11px",
        fontWeight: "700",
      } as google.maps.MarkerLabel,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: active ? 20 : 16,
        fillColor: active ? HIGHLIGHT : "#FFFFFF",
        fillOpacity: 1,
        strokeColor: active ? HIGHLIGHT : PIN_STROKE,
        strokeWeight: active ? 2.5 : 1.5,
      } as google.maps.Symbol,
    };
  }, []);

  const applyActive = useCallback(
    (id: string | null) => {
      markersRef.current.forEach(({ marker, group }) => {
        const isActive = id != null && group.ids.includes(id);
        const style = iconFor(group, isActive);
        if (style.icon) marker.setIcon(style.icon);
        if (style.label) marker.setLabel(style.label);
        marker.setZIndex(isActive ? 1000 : 1);
      });
    },
    [iconFor],
  );

  const focusListing = useCallback((id: string) => {
    setActiveId(id);
    const el = cardEls.current[id];
    el?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const boundsSignature = useCallback((map: google.maps.Map): string => {
    const b = map.getBounds();
    const zoom = map.getZoom();
    if (!b || zoom == null) return "";
    const c = b.getCenter();
    return `${c.lat().toFixed(3)},${c.lng().toFixed(3)},${zoom}`;
  }, []);

  // -- map bootstrap (once) --------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const listeners: google.maps.MapsEventListener[] = [];
    const markers = markersRef.current;
    let resizeObserver: ResizeObserver | null = null;

    const applyInitialView = (g: typeof google, map: google.maps.Map) => {
      const coords = initialCards
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ lat: c.lat as number, lng: c.lng as number }));
      if (coords.length === 1) {
        map.setCenter(coords[0]);
        map.setZoom(12);
      } else if (coords.length > 1) {
        const box = new g.maps.LatLngBounds();
        coords.forEach((c) => box.extend(c));
        map.fitBounds(box, 48);
      } else {
        map.setCenter(AU_CENTER);
        map.setZoom(4);
      }
    };

    const start = (g: typeof google) => {
      const el = mapEl.current;
      if (cancelled || !el) return;

      // A map created while its container is still 0×0 (first paint, a hidden
      // ancestor) renders permanently blank. Wait for a real size first.
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        raf = requestAnimationFrame(() => start(g));
        return;
      }

      googleRef.current = g;
      const map = new g.maps.Map(el, {
        center: AU_CENTER,
        zoom: 4,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        // Scroll / pinch zoom with no modifier key — this is a dedicated map
        // surface, not an embed inside an article.
        gestureHandling: "greedy",
        styles: MONO_MAP_STYLES,
        backgroundColor: "#ECECEC",
      });
      mapRef.current = map;
      applyInitialView(g, map);

      // Keep the tile layer in step with later container resizes
      // (mobile ⇆ desktop, the sticky column, an orientation change).
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) g.maps.event.trigger(mapRef.current, "resize");
        });
        resizeObserver.observe(el);
      }

      listeners.push(
        map.addListener("idle", () => {
          const sig = boundsSignature(map);
          if (!sig) return;
          if (!baselineRef.current) {
            baselineRef.current = sig;
            return;
          }
          setAreaDirty(sig !== baselineRef.current);
        }),
      );

      setMapStatus("ready");
    };

    loadGoogleMaps()
      .then((g) => start(g))
      .catch((error) => {
        if (cancelled) return;
        clientLog.error("Explore map failed to load", error);
        setMapStatus("error");
      });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      listeners.forEach((l) => l.remove());
      markers.forEach(({ marker }) => marker.setMap(null));
      markers.clear();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- markers track `cards` ----------------------------------------------
  useEffect(() => {
    const g = googleRef.current;
    const map = mapRef.current;
    if (!g || !map) return;

    const groups = new Map<string, MarkerGroup>();
    for (const card of cards) {
      if (card.lat == null || card.lng == null) continue;
      const key = groupKey(card.lat, card.lng);
      const existing = groups.get(key);
      if (existing) {
        existing.ids.push(card.id);
        existing.cards.push(card);
      } else {
        groups.set(key, { position: { lat: card.lat, lng: card.lng }, ids: [card.id], cards: [card] });
      }
    }

    markersRef.current.forEach((entry, key) => {
      if (!groups.has(key)) {
        entry.marker.setMap(null);
        markersRef.current.delete(key);
      }
    });

    groups.forEach((group, key) => {
      const existing = markersRef.current.get(key);
      if (existing) {
        existing.group = group;
        return;
      }
      const marker = new g.maps.Marker({
        position: group.position,
        map,
        zIndex: 1,
        ...iconFor(group, false),
      });
      marker.addListener("click", () => {
        const current = markersRef.current.get(key)?.group;
        if (current) focusListing(current.ids[0]);
      });
      markersRef.current.set(key, { marker, group });
    });

    applyActive(activeIdRef.current);
    // `mapStatus` is a dep so markers build once the map finishes loading (the
    // effect's first run, before the map exists, bails at the guard above).
  }, [cards, mapStatus, applyActive, focusListing, iconFor]);

  // -- active highlight --------------------------------------------------
  useEffect(() => {
    applyActive(activeId);
  }, [activeId, applyActive]);

  // -- data fetching ------------------------------------------------------
  const fetchListings = useCallback(async (query: Record<string, string | number>) => {
    const url = qs.stringifyUrl(
      { url: "/api/listings", query },
      { skipNull: true, skipEmptyString: true },
    );
    const res = await fetch(url);
    if (!res.ok) throw new Error(`listings ${res.status}`);
    return (await res.json()) as { listings: ListingCardGeo[]; nextCursor: string | null };
  }, []);

  const handleSearchArea = useCallback(async () => {
    const map = mapRef.current;
    if (!map || searchingArea) return;
    const b = map.getBounds();
    if (!b) return;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();

    setSearchingArea(true);
    setLoadError(false);
    try {
      const areaQuery: Record<string, string> = { ...params };
      delete areaQuery.state;
      delete areaQuery.suburb;
      delete areaQuery.view;
      delete areaQuery.cursor;
      areaQuery.swLat = sw.lat().toFixed(5);
      areaQuery.swLng = sw.lng().toFixed(5);
      areaQuery.neLat = ne.lat().toFixed(5);
      areaQuery.neLng = ne.lng().toFixed(5);

      const data = await fetchListings({ ...areaQuery, limit: PAGE_SIZE });
      setCards(data.listings);
      setCursor(data.nextCursor);
      activeQueryRef.current = areaQuery;
      setAreaDirty(false);
      baselineRef.current = boundsSignature(map);
      setActiveId(null);

      window.history.replaceState(
        window.history.state,
        "",
        qs.stringifyUrl(
          { url: "/explore", query: { ...areaQuery, view: "map" } },
          { skipNull: true, skipEmptyString: true },
        ),
      );
    } catch (error) {
      clientLog.error("Explore area search failed", error);
      setLoadError(true);
      toast.error("Couldn't search this area. Try again.");
    } finally {
      setSearchingArea(false);
    }
  }, [params, searchingArea, fetchListings, boundsSignature]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const data = await fetchListings({
        ...activeQueryRef.current,
        cursor,
        limit: PAGE_SIZE,
      });
      setCards((prev) => [...prev, ...data.listings]);
      setCursor(data.nextCursor);
    } catch (error) {
      clientLog.error("Explore map load more failed", error);
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchListings]);

  const mapFailed = mapStatus === "error";

  return (
    <div
      className={
        mapFailed
          ? ""
          : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-6"
      }
    >
      {/* Map — first in the DOM so it sits on top on mobile; ordered right on lg. */}
      {!mapFailed && (
        <div className="mb-4 lg:order-2 lg:mb-0 lg:sticky lg:top-24">
          <div className="relative h-[46vh] min-h-[300px] w-full overflow-hidden rounded-lg border border-hairline-soft bg-surface-soft lg:h-[calc(100vh-7rem)]">
            <div ref={mapEl} className="h-full w-full" />

            {mapStatus === "loading" && (
              <div
                className="skeleton-wave absolute inset-0"
                role="status"
                aria-label="Loading map"
              />
            )}

            {mapStatus === "ready" && areaDirty && (
              <button
                type="button"
                onClick={handleSearchArea}
                disabled={searchingArea}
                className="absolute left-1/2 top-3 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-active disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {searchingArea ? "Searching…" : "Search this area"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="min-w-0 lg:order-1">
        {mapFailed && (
          <p className="mb-4 rounded-sm border border-hairline bg-surface-soft px-3 py-2 text-sm text-muted">
            The map couldn&rsquo;t load, so results are shown as a list.
          </p>
        )}

        {(offMapCount > 0 || cards.length > 0) && (
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {cards.length} vehicle{cards.length === 1 ? "" : "s"}
            {offMapCount > 0 &&
              ` · ${offMapCount} not shown on the map`}
          </p>
        )}

        {cards.length === 0 ? (
          <div className="rounded-md border border-hairline-soft bg-white p-8 text-center">
            <p className="text-base font-semibold text-ink">No vehicles in this area</p>
            <p className="mt-1 text-sm text-muted">
              Move or zoom the map, then search the area again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.id}
                ref={(el) => {
                  cardEls.current[card.id] = el;
                }}
                onMouseEnter={() => setActiveId(card.id)}
                onMouseLeave={() =>
                  setActiveId((current) => (current === card.id ? null : current))
                }
                className={`rounded-lg transition-shadow ${
                  activeId === card.id
                    ? "outline outline-2 outline-[#F97316] outline-offset-2"
                    : ""
                }`}
              >
                <ListingCard
                  data={card}
                  currentUser={currentUser}
                  tripDays={tripDays}
                  minimal
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 45vw, (max-width: 1280px) 24vw, 16vw"
                />
              </div>
            ))}
          </div>
        )}

        {cursor && cards.length > 0 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-sm border border-ink bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more vehicles"}
            </button>
          </div>
        )}

        {loadError && (
          <p className="mt-3 text-center text-sm text-error">
            Something went wrong loading results. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
