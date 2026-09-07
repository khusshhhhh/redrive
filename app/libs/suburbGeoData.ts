import "server-only";

import rawSuburbs from "@/public/test.Suburb.json";
import {
  buildSuburbIndex,
  parseBounds,
  resolveSuburbCoord,
  scanArea,
  type AreaScan,
  type LatLng,
  type MapBounds,
  type SuburbRecord,
} from "@/app/libs/suburbGeo";

// The Australian suburb dataset (~15k rows, ~3 MB) is imported once and turned
// into lookup maps at module load. Server-only: this file must never reach a
// client bundle (the `server-only` import makes such an import a build error).

const records = rawSuburbs as unknown as SuburbRecord[];
const index = buildSuburbIndex(records);

/** Suburb-centroid coordinate for a listing, or null if the suburb is unknown. */
export function approxCoordForSuburb(
  suburb?: string | null,
  state?: string | null,
): LatLng | null {
  return resolveSuburbCoord(index, suburb, state);
}

/** Resolve a map viewport to the suburbs / states it covers. */
export function scanListingArea(bounds: MapBounds): AreaScan {
  return scanArea(records, bounds);
}

/** Add suburb-level `lat`/`lng` to a card-shaped object for the map view. */
export function withApproxLocation<T extends { suburb?: string | null; state?: string | null }>(
  card: T,
): T & { lat: number | null; lng: number | null } {
  const coord = resolveSuburbCoord(index, card.suburb, card.state);
  return { ...card, lat: coord ? coord.lat : null, lng: coord ? coord.lng : null };
}

export { parseBounds };
export type { MapBounds };
