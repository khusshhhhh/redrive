import { paginationQuerySchema, savedSearchRequestSchema } from "@redrive/contracts/mobile";
import type { SavedSearch } from "@prisma/client";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError, mobileValidationError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { cleanSavedSearchFilters, savedSearchFiltersToJson } from "@/app/libs/savedSearch";

const serialize = (search: SavedSearch) => ({ id: search.id, name: search.name, filters: search.filters, alertFrequency: search.alertFrequency, active: search.active, lastNotifiedAt: search.lastNotifiedAt?.toISOString() || null, createdAt: search.createdAt.toISOString(), updatedAt: search.updatedAt.toISOString() });

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  const rows = await prisma.savedSearch.findMany({ where: { userId: auth.identity.userId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: parsed.data.limit + 1, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}) });
  const hasMore = rows.length > parsed.data.limit;
  const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
  return mobileJson(request, { data: pageRows.map(serialize), page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
}

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, savedSearchRequestSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const filters = cleanSavedSearchFilters(parsed.data.filters);
    if (!Object.keys(filters).length) return mobileError(request, 400, "FILTER_REQUIRED", "Choose at least one search filter.");
    const count = await prisma.savedSearch.count({ where: { userId: auth.identity.userId } });
    if (count >= 20) return mobileError(request, 409, "SAVED_SEARCH_LIMIT", "You can save up to 20 searches.");
    const search = await prisma.savedSearch.create({ data: { userId: auth.identity.userId, name: parsed.data.name, filters: savedSearchFiltersToJson(filters), alertFrequency: parsed.data.alertFrequency, active: parsed.data.alertFrequency !== "OFF", lastNotifiedAt: new Date() } });
    return mobileJson(request, serialize(search), 201);
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile saved search create failed");
  }
}

export const GET = monitorApiRoute("/api/mobile/v1/saved-searches", GETHandler, "GET");
export const POST = monitorApiRoute("/api/mobile/v1/saved-searches", POSTHandler, "POST");
