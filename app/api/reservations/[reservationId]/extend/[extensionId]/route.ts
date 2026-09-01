import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { notificationService } from "@/app/services/notificationService";
import prisma from "@/app/libs/prismadb";
import { applyTripShorten } from "@/app/libs/tripChange";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string; extensionId: string }> };

async function PATCHHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId, extensionId } = await context.params;

  const [extension, reservation] = await Promise.all([
    prisma.tripExtension.findUnique({ where: { id: extensionId } }),
    prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, listing: { select: { userId: true, title: true } } },
    }),
  ]);
  if (!extension || extension.reservationId !== reservationId || !reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (reservation.listing.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the host can respond to this" }, { status: 403 });
  }
  if (extension.status !== "PENDING") {
    return NextResponse.json({ error: `This request is already ${extension.status.toLowerCase()}` }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const decision = body.decision === "APPROVE" ? "APPROVED" : body.decision === "DECLINE" ? "DECLINED" : null;
  if (!decision) return NextResponse.json({ error: "Choose approve or decline" }, { status: 400 });

  const isShorten = extension.kind === "SHORTEN";

  // A shortening that's approved is applied immediately: refund the guest and
  // pull the end date in. `applyTripShorten` flips the row to APPLIED.
  if (isShorten && decision === "APPROVED") {
    await prisma.tripExtension.update({
      where: { id: extensionId },
      data: { status: "APPROVED", respondedAt: new Date() },
    });
    const result = await applyTripShorten(extensionId);
    if (!result.ok) {
      await prisma.tripExtension.update({ where: { id: extensionId }, data: { status: "PENDING" } });
      return NextResponse.json({ error: result.reason || "The change could not be applied" }, { status: 409 });
    }
    await writeAuditEvent({
      request,
      actorUserId: currentUser.id,
      action: "TRIP_SHORTEN_APPROVED",
      targetType: "TripExtension",
      targetId: extensionId,
      metadata: { reservationId, refundAmount: result.refundAmount },
    });
    return NextResponse.json({ ...extension, status: "APPLIED", applied: true });
  }

  const updated = await prisma.tripExtension.update({
    where: { id: extensionId },
    data: { status: decision, respondedAt: new Date() },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action:
      decision === "APPROVED"
        ? isShorten
          ? "TRIP_SHORTEN_APPROVED"
          : "TRIP_EXTENSION_APPROVED"
        : isShorten
          ? "TRIP_SHORTEN_DECLINED"
          : "TRIP_EXTENSION_DECLINED",
    targetType: "TripExtension",
    targetId: extensionId,
    metadata: { reservationId },
  });

  try {
    if (isShorten) {
      await notificationService.notifySystemUpdate(
        reservation.userId,
        decision === "APPROVED" ? "Trip shortening approved" : "Trip shortening declined",
        decision === "APPROVED"
          ? `The host approved returning ${reservation.listing.title} early.`
          : `The host didn't approve shortening ${reservation.listing.title}. The trip ends as booked.`,
        `/reservations/${reservationId}`,
      );
    } else if (decision === "APPROVED") {
      await notificationService.notifyExtensionApproved(
        reservation.userId,
        reservation.listing.title,
        reservationId,
        extensionId,
        extension.extraTotal,
      );
    } else {
      await notificationService.notifyExtensionDeclined(reservation.userId, reservation.listing.title, reservationId);
    }
  } catch (error) {
    console.error("Extension decision notification failed", error);
  }

  return NextResponse.json(updated);
}

export const PATCH = monitorApiRoute(
  "/api/reservations/[reservationId]/extend/[extensionId]",
  PATCHHandler,
  "PATCH",
);
