import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { CLAIM_WINDOW_HOURS, hoursFromNow } from "@/app/libs/bookingWindows";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };
type MediaInput = { url?: unknown; publicId?: unknown; category?: unknown };

async function access(request: Request, reservationId: string) {
  const user = await getCurrentUserEnhanced(request);
  if (!user) return null;
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      userId: true,
      status: true,
      paymentStatus: true,
      startDate: true,
      endDate: true,
      listing: { select: { userId: true } },
    },
  });
  return reservation &&
    (reservation.userId === user.id || reservation.listing.userId === user.id)
    ? { user, reservation }
    : null;
}

function cleanMedia(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 12).flatMap((item: MediaInput) => {
    const publicId = typeof item.publicId === "string" ? item.publicId : "";
    const url = typeof item.url === "string" ? item.url : "";
    const category =
      typeof item.category === "string"
        ? item.category.slice(0, 40)
        : "CONDITION";
    const assetInUrl = new URL(
      url || "/",
      "http://redrive.local",
    ).searchParams.get("asset");
    if (
      !publicId.startsWith("redrive/handovers/") ||
      !url.startsWith("/api/files/handover?asset=") ||
      assetInUrl !== publicId
    )
      return [];
    return [{ publicId, url, category }];
  });
}

async function GETHandler(request: Request, context: Context) {
  const { reservationId } = await context.params;
  const auth = await access(request, reservationId);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const reports = await prisma.handoverReport.findMany({
    where: { reservationId },
    orderBy: { createdAt: "asc" },
  });
  const media = reports.length
    ? await prisma.handoverMedia.findMany({
        where: { reportId: { in: reports.map((report) => report.id) } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  return NextResponse.json(
    reports.map((report) => ({
      ...report,
      media: media.filter((item) => item.reportId === report.id),
    })),
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

async function PUTHandler(request: Request, context: Context) {
  const { reservationId } = await context.params;
  const auth = await access(request, reservationId);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rateLimit = await consumeRateLimits([
    { scope: "handover", identifier: auth.user.id, limit: 60, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);
  if (!["PAID_HELD", "RELEASED"].includes(auth.reservation.paymentStatus)) {
    return NextResponse.json(
      { error: "Payment must be secured before handover" },
      { status: 409 },
    );
  }
  const body = await request.json().catch(() => ({}));
  if (body.phase !== "PICKUP" && body.phase !== "RETURN")
    return NextResponse.json(
      { error: "Choose pickup or return handover" },
      { status: 400 },
    );
  const phase: "PICKUP" | "RETURN" = body.phase;
  const now = new Date();
  const availableAt =
    phase === "PICKUP" ? auth.reservation.startDate : auth.reservation.endDate;
  if (now < availableAt)
    return NextResponse.json(
      {
        error: `${phase === "PICKUP" ? "Pickup" : "Return"} handover opens on the booked date`,
      },
      { status: 409 },
    );
  if (
    phase === "PICKUP" &&
    !["APPROVED", "ACTIVE"].includes(auth.reservation.status)
  )
    return NextResponse.json(
      { error: "Pickup handover is not available" },
      { status: 409 },
    );
  if (
    phase === "RETURN" &&
    !["ACTIVE", "COMPLETED"].includes(auth.reservation.status)
  )
    return NextResponse.json(
      { error: "Complete the pickup handover first" },
      { status: 409 },
    );

  const existing = await prisma.handoverReport.findUnique({
    where: { reservationId_phase: { reservationId, phase } },
  });
  if (body.action === "ACKNOWLEDGE") {
    if (!existing || !["SUBMITTED", "AGREED"].includes(existing.status))
      return NextResponse.json(
        { error: "The handover has not been submitted" },
        { status: 409 },
      );
    const acknowledgedByIds = Array.from(
      new Set([...existing.acknowledgedByIds, auth.user.id]),
    );
    const participants = [
      auth.reservation.userId,
      auth.reservation.listing.userId,
    ];
    const agreed = participants.every((id) => acknowledgedByIds.includes(id));
    const report = await prisma.handoverReport.update({
      where: { id: existing.id },
      data: { acknowledgedByIds, status: agreed ? "AGREED" : "SUBMITTED" },
    });
    if (
      agreed &&
      phase === "PICKUP" &&
      auth.reservation.status === "APPROVED"
    ) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "ACTIVE" },
      });
    }

    // Return handover agreed → hold the payout for a fixed claim window so the
    // host can inspect the vehicle. The payouts cron releases it after the
    // window if no incident was opened.
    let claimWindowEndsAt: Date | null = null;
    if (agreed && phase === "RETURN") {
      claimWindowEndsAt = hoursFromNow(CLAIM_WINDOW_HOURS);
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { returnHandoverAgreedAt: now, claimWindowEndsAt },
      });
      await notificationService
        .notifyClaimWindow(
          auth.reservation.listing.userId,
          auth.reservation.userId,
          reservationId,
        )
        .catch(() => undefined);
    }

    await writeAuditEvent({
      request,
      actorUserId: auth.user.id,
      action: "HANDOVER_ACKNOWLEDGED",
      targetType: "Reservation",
      targetId: reservationId,
      metadata: { phase, agreed, claimWindow: Boolean(claimWindowEndsAt) },
    });
    return NextResponse.json({
      ...report,
      claimWindowEndsAt: claimWindowEndsAt?.toISOString() ?? null,
    });
  }

  if (existing?.status !== "DRAFT")
    return NextResponse.json(
      {
        error:
          "A submitted handover cannot be changed; report an issue instead",
      },
      { status: 409 },
    );
  if (existing && existing.submittedById !== auth.user.id)
    return NextResponse.json(
      { error: "The other party started this handover" },
      { status: 409 },
    );
  const fuel =
    body.fuelOrChargeLevel === "" || body.fuelOrChargeLevel == null
      ? null
      : Number(body.fuelOrChargeLevel);
  const odometer =
    body.odometer === "" || body.odometer == null
      ? null
      : Number(body.odometer);
  if (
    (fuel !== null && (!Number.isFinite(fuel) || fuel < 0 || fuel > 100)) ||
    (odometer !== null && (!Number.isFinite(odometer) || odometer < 0))
  )
    return NextResponse.json(
      { error: "Enter valid handover readings" },
      { status: 400 },
    );
  const submit = body.action === "SUBMIT";
  const media = cleanMedia(body.media);
  if (submit && media.length < 4)
    return NextResponse.json(
      { error: "Add at least four condition photos" },
      { status: 400 },
    );
  const checklist =
    body.checklist && typeof body.checklist === "object" ? body.checklist : {};
  const report = await prisma.handoverReport.upsert({
    where: { reservationId_phase: { reservationId, phase } },
    create: {
      reservationId,
      phase,
      submittedById: auth.user.id,
      odometer: odometer === null ? null : Math.round(odometer),
      fuelOrChargeLevel: fuel === null ? null : Math.round(fuel),
      checklist,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 2000)
          : null,
      acknowledgedByIds: submit ? [auth.user.id] : [],
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedAt: submit ? now : null,
    },
    update: {
      odometer: odometer === null ? null : Math.round(odometer),
      fuelOrChargeLevel: fuel === null ? null : Math.round(fuel),
      checklist,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, 2000)
          : null,
      ...(submit
        ? {
            status: "SUBMITTED",
            submittedAt: now,
            acknowledgedByIds: [auth.user.id],
          }
        : {}),
    },
  });
  if (submit && media.length)
    await prisma.handoverMedia.createMany({
      data: media.map((item) => ({ ...item, reportId: report.id })),
    });
  await writeAuditEvent({
    request,
    actorUserId: auth.user.id,
    action: submit ? "HANDOVER_SUBMITTED" : "HANDOVER_SAVED",
    targetType: "Reservation",
    targetId: reservationId,
    metadata: { phase, photoCount: media.length },
  });
  return NextResponse.json({ ...report, media });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/handover", GETHandler, "GET");

export const PUT = monitorApiRoute("/api/reservations/[reservationId]/handover", PUTHandler, "PUT");
