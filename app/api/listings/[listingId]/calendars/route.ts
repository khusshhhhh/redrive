import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { syncOneCalendar } from "@/app/libs/calendarSync";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ listingId: string }> };

async function ownedListing(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true },
  });
  return listing && listing.userId === userId ? listing : null;
}

async function GETHandler(_request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  if (!(await ownedListing(currentUser.id, listingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const calendars = await prisma.externalCalendar.findMany({
    where: { listingId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(calendars, { headers: { "Cache-Control": "private, no-store" } });
}

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  if (!(await ownedListing(currentUser.id, listingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rateLimit = await consumeRateLimits([
    { scope: "calendar-add-user", identifier: currentUser.id, limit: 20, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : null;

  let parsed: URL;
  try {
    parsed = new URL(url.replace(/^webcal:/i, "https:"));
  } catch {
    return NextResponse.json({ error: "Enter a valid calendar URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Calendar URL must be http or https" }, { status: 400 });
  }
  if (url.length > 2_048) {
    return NextResponse.json({ error: "That URL is too long" }, { status: 400 });
  }

  const existing = await prisma.externalCalendar.count({ where: { listingId } });
  if (existing >= 5) {
    return NextResponse.json({ error: "Up to 5 calendars per listing" }, { status: 409 });
  }

  const calendar = await prisma.externalCalendar.create({
    data: { listingId, url: parsed.toString(), label },
  });

  const result = await syncOneCalendar(calendar.id).catch(() => ({ ok: false, blocks: 0, error: "sync failed" }));
  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "EXTERNAL_CALENDAR_ADDED",
    targetType: "ExternalCalendar",
    targetId: calendar.id,
    metadata: { listingId },
  });

  const fresh = await prisma.externalCalendar.findUnique({ where: { id: calendar.id } });
  return NextResponse.json({ calendar: fresh, sync: result }, { status: 201 });
}

async function DELETEHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await context.params;
  if (!(await ownedListing(currentUser.id, listingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const calendarId = new URL(request.url).searchParams.get("id") || "";
  const calendar = await prisma.externalCalendar.findUnique({ where: { id: calendarId } });
  if (!calendar || calendar.listingId !== listingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.$transaction([
    prisma.availabilityBlock.deleteMany({
      where: { listingId, type: "EXTERNAL_ICAL", reason: `ical:${calendarId}` },
    }),
    prisma.externalCalendar.delete({ where: { id: calendarId } }),
  ]);
  return NextResponse.json({ removed: true });
}

export const GET = monitorApiRoute("/api/listings/[listingId]/calendars", GETHandler, "GET");
export const POST = monitorApiRoute("/api/listings/[listingId]/calendars", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/listings/[listingId]/calendars", DELETEHandler, "DELETE");
