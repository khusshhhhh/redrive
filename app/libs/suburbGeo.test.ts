import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSuburbIndex,
  resolveSuburbCoord,
  parseBounds,
  scanArea,
  boundsFromCoords,
  type SuburbRecord,
} from "./suburbGeo";

const FIXTURE: SuburbRecord[] = [
  { suburb: "Sydney", state: "NSW", lat: -33.8688, lng: 151.2093 },
  { suburb: "Newtown", state: "NSW", lat: -33.8983, lng: 151.1795 },
  { suburb: "Richmond", state: "NSW", lat: -33.6, lng: 150.75 },
  { suburb: "Richmond", state: "VIC", lat: -37.8183, lng: 144.9986 },
  { suburb: "Fitzroy", state: "VIC", lat: -37.8, lng: 144.978 },
  { suburb: "Brisbane", state: "QLD", lat: -27.4698, lng: 153.0251 },
  { suburb: "Nowhere", state: null, lat: -25, lng: 133 },
  { suburb: "Broken", state: "NSW", lat: Number.NaN, lng: 10 },
];

test("buildSuburbIndex keys by suburb+state and by suburb alone", () => {
  const index = buildSuburbIndex(FIXTURE);
  assert.equal(index.byKey.get("sydney|NSW")?.lat, -33.8688);
  assert.equal(index.byKey.get("richmond|VIC")?.lat, -37.8183);
  assert.equal(index.byKey.get("richmond|NSW")?.lat, -33.6);
  // first-seen wins for the state-less fallback
  assert.equal(index.bySuburb.get("richmond")?.lat, -33.6);
  // records with a non-finite coord are skipped
  assert.equal(index.byKey.has("broken|NSW"), false);
});

test("resolveSuburbCoord prefers the state match, falls back to suburb", () => {
  const index = buildSuburbIndex(FIXTURE);
  assert.deepEqual(resolveSuburbCoord(index, "Richmond", "VIC"), { lat: -37.8183, lng: 144.9986 });
  assert.deepEqual(resolveSuburbCoord(index, "richmond", "vic"), { lat: -37.8183, lng: 144.9986 });
  // unknown state → suburb fallback (first seen)
  assert.deepEqual(resolveSuburbCoord(index, "Richmond", "WA"), { lat: -33.6, lng: 150.75 });
  assert.equal(resolveSuburbCoord(index, "Atlantis", "NSW"), null);
  assert.equal(resolveSuburbCoord(index, "", "NSW"), null);
  assert.equal(resolveSuburbCoord(index, null), null);
});

test("parseBounds rejects malformed, inverted and oversized viewports", () => {
  assert.equal(parseBounds({ swLat: "a", swLng: 1, neLat: 2, neLng: 3 }), null);
  assert.equal(parseBounds({ swLat: 2, swLng: 1, neLat: 1, neLng: 3 }), null); // inverted lat
  assert.equal(parseBounds({ swLat: 1, swLng: 3, neLat: 2, neLng: 1 }), null); // inverted lng
  assert.equal(parseBounds({ swLat: -80, swLng: -170, neLat: 80, neLng: 170 }), null); // whole globe
  assert.deepEqual(
    parseBounds({ swLat: -34.12345, swLng: 150.98765, neLat: -33.6, neLng: 151.4 }),
    { swLat: -34.123, swLng: 150.988, neLat: -33.6, neLng: 151.4 },
  );
});

test("scanArea returns the suburbs and states inside the box", () => {
  const bounds = parseBounds({ swLat: -34, swLng: 150.5, neLat: -33.5, neLng: 151.5 })!;
  const scan = scanArea(FIXTURE, bounds);
  assert.deepEqual(scan.suburbNames.sort(), ["Newtown", "Richmond", "Sydney"]);
  assert.deepEqual(scan.states, ["NSW"]);
  assert.equal(scan.capped, false);
});

test("scanArea over open ocean finds nothing", () => {
  const bounds = parseBounds({ swLat: -10, swLng: 160, neLat: -5, neLng: 165 })!;
  const scan = scanArea(FIXTURE, bounds);
  assert.deepEqual(scan.suburbNames, []);
  assert.deepEqual(scan.states, []);
});

test("scanArea caps the suburb list and signals a state-only fallback", () => {
  const many: SuburbRecord[] = Array.from({ length: 50 }, (_, i) => ({
    suburb: `Town ${i}`,
    state: "NSW",
    lat: -33.8,
    lng: 151.2,
  }));
  const bounds = parseBounds({ swLat: -34, swLng: 150.5, neLat: -33.5, neLng: 151.5 })!;
  const scan = scanArea(many, bounds, 10);
  assert.equal(scan.capped, true);
  assert.deepEqual(scan.suburbNames, []);
  assert.deepEqual(scan.states, ["NSW"]);
});

test("boundsFromCoords wraps every point", () => {
  assert.equal(boundsFromCoords([]), null);
  assert.deepEqual(
    boundsFromCoords([
      { lat: -33.8, lng: 151.2 },
      { lat: -37.8, lng: 144.9 },
      { lat: -27.4, lng: 153.0 },
    ]),
    { swLat: -37.8, swLng: 144.9, neLat: -27.4, neLng: 153.0 },
  );
});
