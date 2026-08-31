/**
 * Server-safe copies of the marketplace category and state reference lists.
 *
 * The canonical UI sources — `app/components/navbar/Categories.tsx` and
 * `app/components/inputs/StateSelector.tsx` — are `"use client"` modules that
 * also carry icons and react-select config, so they can't be imported from
 * server code. Keep these label strings identical to those files.
 */

export const CATEGORY_LABELS = [
  "Car",
  "Utes",
  "Bikes",
  "Caravans",
  "Motorhomes",
  "Boats",
  "JetSkies",
  "Yachts",
  "Vans",
  "Trucks",
] as const;

export const AU_STATE_LIST: { value: string; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];
