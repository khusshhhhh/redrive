import { objectIdSchema, savedSearchPatchSchema } from "@redrive/contracts/mobile";
import type { SavedSearch } from "@prisma/client";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";

type Context = { params: Promise<{ searchId: string }> };
const serialize = (search: SavedSearch) => ({ id: search.id, name: search.name, filters: search.filters, alertFrequency: search.alertFrequency, active: search.active, lastNotifiedAt: search.lastNotifiedAt?.toISOString() || null, createdAt: search.createdAt.toISOString(), updatedAt: search.updatedAt.toISOString() });

async function PATCHHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { searchId } = await context.params;
  if (!objectIdSchema.safeParse(searchId).success) return mobileError(request, 400, "INVALID_SAVED_SEARCH", "That saved-search identifier is invalid.");
  const parsed = await parseMobileJson(request, savedSearchPatchSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const existing = await prisma.savedSearch.findUnique({ where: { id: searchId } });
    if (!existing || existing.userId !== auth.identity.userId) return mobileError(request, 404, "SAVED_SEARCH_NOT_FOUND", "That saved search was not found.");
    const frequency = parsed.data.alertFrequency;
    const updated = await prisma.savedSearch.update({ where: { id: searchId }, data: { ...parsed.data, ...(frequency ? { active: frequency !== "OFF" && (parsed.data.active ?? existing.active) } : {}) } });
    return mobileJson(request, serialize(updated));
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile saved search update failed");
  }
}

async function DELETEHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { searchId } = await context.params;
  if (!objectIdSchema.safeParse(searchId).success) return mobileError(request, 400, "INVALID_SAVED_SEARCH", "That saved-search identifier is invalid.");
  const existing = await prisma.savedSearch.findUnique({ where: { id: searchId }, select: { userId: true } });
  if (!existing || existing.userId !== auth.identity.userId) return mobileError(request, 404, "SAVED_SEARCH_NOT_FOUND", "That saved search was not found.");
  await prisma.savedSearch.delete({ where: { id: searchId } });
  return mobileJson(request, { deleted: true });
}

export const PATCH = monitorApiRoute("/api/mobile/v1/saved-searches/[searchId]", PATCHHandler, "PATCH");
export const DELETE = monitorApiRoute("/api/mobile/v1/saved-searches/[searchId]", DELETEHandler, "DELETE");
