import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { notificationService } from "@/app/services/notificationService";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

async function participant(request: Request, id: string) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return null;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      autoReleaseAt: true,
      claimWindowEndsAt: true,
      listing: { select: { userId: true, title: true } },
    },
  });
  return reservation && [reservation.userId, reservation.listing.userId].includes(user.id)
    ? { user, reservation }
    : null;
}

async function GETHandler(request: Request, context: Context) {
  const { reservationId } = await context.params;
  const access = await participant(request, reservationId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(
    await prisma.incidentCase.findMany({
      where: { reservationId },
      orderBy: { createdAt: "desc" },
    }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

async function POSTHandler(request: Request, context: Context) {
  const { reservationId } = await context.params;
  const access = await participant(request, reservationId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, reservation } = access;

  // Claims close once the payout is released. During an open trip and the
  // 24-hour post-handover window they're allowed.
  if (
    reservation.status === "COMPLETED" ||
    (reservation.claimWindowEndsAt && reservation.claimWindowEndsAt.getTime() < Date.now())
  ) {
    return NextResponse.json(
      {
        error:
          "The claim window for this trip has closed. Contact Redrive support if there's a serious issue.",
        code: "CLAIM_WINDOW_CLOSED",
      },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (summary.length < 10 || summary.length > 3000) {
    return NextResponse.json({ error: "Describe what happened in 10 to 3000 characters" }, { status: 400 });
  }

  // Auto-attach the handover photos as evidence — they are the record of the
  // vehicle's condition at pickup and return.
  const handoverReports = await prisma.handoverReport.findMany({
    where: { reservationId },
    select: { id: true, phase: true },
  });
  const handoverPhotos = handoverReports.length
    ? (
        await prisma.handoverMedia.findMany({
          where: { reportId: { in: handoverReports.map((report) => report.id) } },
          select: { url: true, category: true, reportId: true },
          take: 24,
        })
      ).map((media) => ({
        url: media.url,
        category: media.category,
        phase: handoverReports.find((report) => report.id === media.reportId)?.phase ?? null,
      }))
    : [];

  const incident = await prisma.incidentCase.create({
    data: {
      reservationId,
      reporterUserId: user.id,
      type: typeof body.type === "string" ? body.type.slice(0, 50) : "OTHER",
      summary,
      location: typeof body.location === "string" ? body.location.slice(0, 300) : null,
      evidence: {
        reporterPhotos: Array.isArray(body.evidence) ? body.evidence.slice(0, 12) : [],
        handoverPhotos,
      },
    },
  });

  // Hold the payout well clear of the auto-release backstop while this is open.
  const heldUntil = new Date(Date.now() + 14 * 86_400_000);
  if (!reservation.autoReleaseAt || reservation.autoReleaseAt < heldUntil) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { autoReleaseAt: heldUntil },
    });
  }

  const otherPartyId =
    user.id === reservation.userId ? reservation.listing.userId : reservation.userId;
  try {
    await notificationService.notifySecurityAlert(
      otherPartyId,
      "An issue was reported on your trip",
      `The other party reported an issue with the ${reservation.listing.title} trip. Open the trip to add your side — the payout is on hold until it's resolved.`,
      `/reservations/${reservationId}`,
    );
  } catch (error) {
    console.error("Incident notification failed", error);
  }

  await writeAuditEvent({
    request,
    actorUserId: user.id,
    action: "INCIDENT_REPORTED",
    targetType: "IncidentCase",
    targetId: incident.id,
    metadata: { reservationId, type: incident.type },
  });

  return NextResponse.json(incident, { status: 201 });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/incidents", GETHandler, "GET");
export const POST = monitorApiRoute("/api/reservations/[reservationId]/incidents", POSTHandler, "POST");
