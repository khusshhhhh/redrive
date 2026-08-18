import type { Prisma } from "@prisma/client";

export const SAVED_SEARCH_FREQUENCIES = ["OFF", "DAILY", "WEEKLY"] as const;
export type SavedSearchFrequency = typeof SAVED_SEARCH_FREQUENCIES[number];

const ALLOWED_FILTERS = [
  "state", "suburb", "category", "information", "startDate", "endDate",
  "guestCount", "sleepCount", "minPrice", "maxPrice",
] as const;

export type SavedSearchFilters = Partial<Record<typeof ALLOWED_FILTERS[number], string | number>>;

export const cleanSavedSearchFilters = (input: unknown): SavedSearchFilters => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const clean: SavedSearchFilters = {};

  for (const key of ALLOWED_FILTERS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) clean[key] = value.trim().slice(0, 120);
    if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
  }

  return clean;
};

export const savedSearchFiltersToJson = (filters: SavedSearchFilters) =>
  filters as Prisma.InputJsonValue;

export const savedSearchFiltersToQuery = (filters: SavedSearchFilters) => {
  const query: Record<string, unknown> = {};
  if (filters.state && filters.state !== "Anywhere") query.state = filters.state;
  if (filters.suburb) query.suburb = { equals: filters.suburb, mode: "insensitive" };
  if (filters.category) query.category = filters.category;
  if (filters.guestCount) query.guestCount = { gte: Number(filters.guestCount) };
  if (filters.sleepCount) query.sleepCount = { gte: Number(filters.sleepCount) };
  if (filters.minPrice || filters.maxPrice) {
    query.price = {
      ...(filters.minPrice ? { gte: Number(filters.minPrice) } : {}),
      ...(filters.maxPrice ? { lte: Number(filters.maxPrice) } : {}),
    };
  }
  if (filters.startDate && filters.endDate) {
    query.NOT = {
      reservations: {
        some: {
          status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] },
          startDate: { lte: new Date(String(filters.endDate)) },
          endDate: { gte: new Date(String(filters.startDate)) },
        },
      },
    };
  }
  return query;
};
