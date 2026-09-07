// Pure geo helpers for the /explore map view. No data, no I/O, no `server-only`
// — so they can be unit-tested directly. `suburbGeoData.ts` is the thin wrapper
// that feeds these the real suburb dataset on the server.
//
// Redrive never exposes a host's exact address on the discovery surface
// (`getListings` strips `latitude`/`longitude`). The map therefore works at
// suburb granularity: every listing is placed at its suburb's centroid, and
// "search this area" resolves the map viewport to the set of suburbs inside it.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface SuburbRecord {
  suburb?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface SuburbIndex {
  /** `"suburb-lowercased|STATE"` → centroid. */
  byKey: Map<string, LatLng>;
  /** `"suburb-lowercased"` → first-seen centroid (fallback when state is unknown). */
  bySuburb: Map<string, LatLng>;
}

const normSuburb = (value: string) => value.trim().toLowerCase();
const normState = (value: string) => value.trim().toUpperCase();

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isUsableRecord = (
  record: SuburbRecord | null | undefined,
): record is SuburbRecord & { suburb: string; lat: number; lng: number } =>
  Boolean(record) &&
  typeof record!.suburb === "string" &&
  record!.suburb.trim().length > 0 &&
  isFiniteNumber(record!.lat) &&
  isFiniteNumber(record!.lng);

export function buildSuburbIndex(records: Iterable<SuburbRecord>): SuburbIndex {
  const byKey = new Map<string, LatLng>();
  const bySuburb = new Map<string, LatLng>();

  for (const record of records) {
    if (!isUsableRecord(record)) continue;
    const suburbKey = normSuburb(record.suburb);
    const coord: LatLng = { lat: record.lat, lng: record.lng };

    if (record.state) {
      const key = `${suburbKey}|${normState(record.state)}`;
      if (!byKey.has(key)) byKey.set(key, coord);
    }
    if (!bySuburb.has(suburbKey)) bySuburb.set(suburbKey, coord);
  }

  return { byKey, bySuburb };
}

/** Suburb centroid for a listing, or null when the suburb isn't in the dataset. */
export function resolveSuburbCoord(
  index: SuburbIndex,
  suburb?: string | null,
  state?: string | null,
): LatLng | null {
  if (!suburb || typeof suburb !== "string") return null;
  const suburbKey = normSuburb(suburb);
  if (!suburbKey) return null;

  if (state && typeof state === "string") {
    const hit = index.byKey.get(`${suburbKey}|${normState(state)}`);
    if (hit) return hit;
  }
  return index.bySuburb.get(suburbKey) ?? null;
}

const roundTo = (value: number, dp = 3) => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

/**
 * Validate and normalise a viewport from query-string values. Returns null for
 * anything malformed or absurdly large (treated as "no area filter"), so a bad
 * URL can never crash the search.
 */
export function parseBounds(input: {
  swLat?: number | string | null;
  swLng?: number | string | null;
  neLat?: number | string | null;
  neLng?: number | string | null;
}): MapBounds | null {
  const swLat = Number(input.swLat);
  const swLng = Number(input.swLng);
  const neLat = Number(input.neLat);
  const neLng = Number(input.neLng);

  if (![swLat, swLng, neLat, neLng].every(Number.isFinite)) return null;
  if (swLat < -90 || neLat > 90 || swLat >= neLat) return null;
  if (swLng < -180 || neLng > 180 || swLng >= neLng) return null;
  // Whole-continent-and-then-some viewport → not a meaningful "area".
  if (neLat - swLat > 60 || neLng - swLng > 60) return null;

  return {
    swLat: roundTo(swLat),
    swLng: roundTo(swLng),
    neLat: roundTo(neLat),
    neLng: roundTo(neLng),
  };
}

const withinBounds = (lat: number, lng: number, bounds: MapBounds) =>
  lat >= bounds.swLat &&
  lat <= bounds.neLat &&
  lng >= bounds.swLng &&
  lng <= bounds.neLng;

export interface AreaScan {
  /** Canonical suburb names inside the viewport (empty when `capped`). */
  suburbNames: string[];
  /** States touched by the viewport — the coarse fallback filter. */
  states: string[];
  /** True when more than `cap` suburbs fall in view (zoomed too far out to
   *  filter by suburb — callers fall back to `states`). */
  capped: boolean;
}

export function scanArea(
  records: Iterable<SuburbRecord>,
  bounds: MapBounds,
  cap = 400,
): AreaScan {
  const names = new Set<string>();
  const states = new Set<string>();
  let capped = false;

  for (const record of records) {
    if (!isUsableRecord(record)) continue;
    if (!withinBounds(record.lat, record.lng, bounds)) continue;

    if (record.state) states.add(normState(record.state));
    if (names.size >= cap) {
      capped = true;
      continue;
    }
    names.add(record.suburb);
  }

  return {
    suburbNames: capped ? [] : [...names],
    states: [...states],
    capped,
  };
}

/** Bounding box that contains every coordinate, or null for an empty list. */
export function boundsFromCoords(coords: ReadonlyArray<LatLng>): MapBounds | null {
  if (!coords.length) return null;
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;
  for (const { lat, lng } of coords) {
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) continue;
    swLat = Math.min(swLat, lat);
    neLat = Math.max(neLat, lat);
    swLng = Math.min(swLng, lng);
    neLng = Math.max(neLng, lng);
  }
  if (!Number.isFinite(swLat)) return null;
  return { swLat, swLng, neLat, neLng };
}
