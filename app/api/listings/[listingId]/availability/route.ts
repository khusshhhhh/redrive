import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ listingId: string }> };

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  if (!listing || listing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const blocks = await prisma.availabilityBlock.findMany({ where: { listingId, endDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 250 });
  return NextResponse.json(blocks);
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  if (!listing || listing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({})); const startDate = new Date(body.startDate); const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const block = await prisma.availabilityBlock.create({ data: { listingId, startDate, endDate, type: body.type === "MAINTENANCE" ? "MAINTENANCE" : "OWNER_BLOCK", reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : null } });
  await writeAuditEvent({ request, actorUserId: user.id, action: "AVAILABILITY_BLOCK_CREATED", targetType: "Listing", targetId: listingId });
  return NextResponse.json(block, { status: 201 });
}

export async function DELETE(request: Request, context: Context) {
  const user = await getCurrentUserEnhanced(request); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params; const blockId = new URL(request.url).searchParams.get("blockId");
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
  const block = blockId ? await prisma.availabilityBlock.findUnique({ where: { id: blockId } }) : null;
  if (!listing || listing.userId !== user.id || !block || block.listingId !== listingId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.availabilityBlock.delete({ where: { id: block.id } });
  await writeAuditEvent({ request, actorUserId: user.id, action: "AVAILABILITY_BLOCK_REMOVED", targetType: "Listing", targetId: listingId });
  return NextResponse.json({ deleted: true });
}

