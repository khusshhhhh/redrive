import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };
async function access(request: Request, reservationId: string) {
  const user = await getCurrentUserEnhanced(request); if (!user) return null;
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { userId: true, status: true, listing: { select: { userId: true } } } });
  return reservation && (reservation.userId === user.id || reservation.listing.userId === user.id) ? { user, reservation } : null;
}

export async function GET(request: Request, context: Context) {
  const { reservationId } = await context.params; if (!await access(request, reservationId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.handoverReport.findMany({ where: { reservationId }, orderBy: { createdAt: "asc" } }), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, context: Context) {
  const { reservationId } = await context.params; const auth = await access(request, reservationId); if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["APPROVED", "ACTIVE", "COMPLETED"].includes(auth.reservation.status)) return NextResponse.json({ error: "Handover is only available for confirmed trips" }, { status: 409 });
  const body = await request.json().catch(() => ({})); const phase = body.phase === "RETURN" ? "RETURN" : "PICKUP";
  const fuel = Number(body.fuelOrChargeLevel); const odometer = Number(body.odometer);
  if ((Number.isFinite(fuel) && (fuel < 0 || fuel > 100)) || (Number.isFinite(odometer) && odometer < 0)) return NextResponse.json({ error: "Invalid handover readings" }, { status: 400 });
  const submitted = body.submit === true;
  const report = await prisma.handoverReport.upsert({
    where: { reservationId_phase: { reservationId, phase } },
    create: { reservationId, phase, submittedById: auth.user.id, odometer: Number.isFinite(odometer) ? Math.round(odometer) : null, fuelOrChargeLevel: Number.isFinite(fuel) ? Math.round(fuel) : null, checklist: body.checklist || {}, notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null, acknowledgedByIds: submitted ? [auth.user.id] : [], status: submitted ? "SUBMITTED" : "DRAFT", submittedAt: submitted ? new Date() : null },
    update: { odometer: Number.isFinite(odometer) ? Math.round(odometer) : null, fuelOrChargeLevel: Number.isFinite(fuel) ? Math.round(fuel) : null, checklist: body.checklist || {}, notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null, ...(submitted ? { status: "SUBMITTED", submittedAt: new Date(), acknowledgedByIds: { push: auth.user.id } } : {}) },
  });
  await writeAuditEvent({ request, actorUserId: auth.user.id, action: submitted ? "HANDOVER_SUBMITTED" : "HANDOVER_SAVED", targetType: "Reservation", targetId: reservationId, metadata: { phase } });
  return NextResponse.json(report);
}

