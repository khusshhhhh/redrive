import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { writeAuditEvent } from "@/app/libs/security";
import { revalidateTag } from "next/cache";
import { PUBLIC_LISTINGS_CACHE_TAG } from "@/app/actions/getListings";

type Context = { params: Promise<{ listingId: string }> };

async function GETHandler(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  if (!listing || listing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const blocks = await prisma.availabilityBlock.findMany({ where: { listingId, endDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 250 });
  return NextResponse.json(blocks);
}

async function POSTHandler(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  if (!listing || listing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const startDate = new Date(body.startDate); const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const block = await prisma.availabilityBlock.create({ data: { listingId, startDate, endDate, type: body.type === "MAINTENANCE" ? "MAINTENANCE" : "OWNER_BLOCK", reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : null } });
  revalidateTag(PUBLIC_LISTINGS_CACHE_TAG);
  await writeAuditEvent({ request, actorUserId: user.id, action: "AVAILABILITY_BLOCK_CREATED", targetType: "Listing", targetId: listingId });
  return NextResponse.json(block, { status: 201 });
}

async function DELETEHandler(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params; const blockId = new URL(request.url).searchParams.get("blockId");
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  const block = blockId ? await prisma.availabilityBlock.findUnique({ where: { id: blockId } }) : null;
  if (!listing || listing.userId !== user.id || !block || block.listingId !== listingId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.availabilityBlock.delete({ where: { id: block.id } });
  revalidateTag(PUBLIC_LISTINGS_CACHE_TAG);
  await writeAuditEvent({ request, actorUserId: user.id, action: "AVAILABILITY_BLOCK_REMOVED", targetType: "Listing", targetId: listingId });
  return NextResponse.json({ deleted: true });
}

export const GET = monitorApiRoute("/api/listings/[listingId]/availability", GETHandler, "GET");

export const POST = monitorApiRoute("/api/listings/[listingId]/availability", POSTHandler, "POST");

export const DELETE = monitorApiRoute("/api/listings/[listingId]/availability", DELETEHandler, "DELETE");
