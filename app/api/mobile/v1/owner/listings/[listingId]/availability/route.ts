import { availabilityBlockRequestSchema, objectIdSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { executeIdempotent } from "@/app/libs/mobile-api/idempotency";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ listingId: string }> };

async function ownedListing(request: Request, listingId: string, userId: string) {
  if (!objectIdSchema.safeParse(listingId).success) return { response: mobileError(request, 400, "INVALID_LISTING_ID", "That listing identifier is invalid.") };
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  return listing?.userId === userId ? { listing } : { response: mobileError(request, 404, "LISTING_NOT_FOUND", "That owned listing was not found.") };
}

async function GETHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { listingId } = await context.params;
  const ownership = await ownedListing(request, listingId, auth.identity.userId);
  if ("response" in ownership) return ownership.response;
  const blocks = await prisma.availabilityBlock.findMany({ where: { listingId, endDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 250 });
  return mobileJson(request, { data: blocks.map((block) => ({ id: block.id, startDate: block.startDate.toISOString(), endDate: block.endDate.toISOString(), type: block.type, reason: block.reason, createdAt: block.createdAt.toISOString() })) });
}

async function POSTHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { listingId } = await context.params;
  const ownership = await ownedListing(request, listingId, auth.identity.userId);
  if ("response" in ownership) return ownership.response;
  const parsed = await parseMobileJson(request, availabilityBlockRequestSchema);
  if (!parsed.ok) return parsed.response;
  if (new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) return mobileError(request, 400, "INVALID_DATE_RANGE", "The block end date must not be before its start.");
  return executeIdempotent({ request, actorUserId: auth.identity.userId, scope: `listing:${listingId}:availability`, payload: parsed.data, handler: async () => {
    const block = await prisma.availabilityBlock.create({ data: { listingId, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), type: "OWNER_BLOCK", reason: parsed.data.reason || null } });
    await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "AVAILABILITY_BLOCK_CREATED", targetType: "Listing", targetId: listingId });
    return { status: 201, body: { id: block.id, startDate: block.startDate.toISOString(), endDate: block.endDate.toISOString(), type: block.type, reason: block.reason } };
  } });
}

async function DELETEHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { listingId } = await context.params;
  const ownership = await ownedListing(request, listingId, auth.identity.userId);
  if ("response" in ownership) return ownership.response;
  const blockId = new URL(request.url).searchParams.get("blockId") || "";
  if (!objectIdSchema.safeParse(blockId).success) return mobileError(request, 400, "INVALID_BLOCK_ID", "That availability-block identifier is invalid.");
  const block = await prisma.availabilityBlock.findUnique({ where: { id: blockId } });
  if (!block || block.listingId !== listingId) return mobileError(request, 404, "BLOCK_NOT_FOUND", "That availability block was not found.");
  await prisma.availabilityBlock.delete({ where: { id: block.id } });
  await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "AVAILABILITY_BLOCK_REMOVED", targetType: "Listing", targetId: listingId });
  return mobileJson(request, { deleted: true });
}

export const GET = monitorApiRoute("/api/mobile/v1/owner/listings/[listingId]/availability", GETHandler, "GET");
export const POST = monitorApiRoute("/api/mobile/v1/owner/listings/[listingId]/availability", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/mobile/v1/owner/listings/[listingId]/availability", DELETEHandler, "DELETE");
