import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { notificationService } from "@/app/services/notificationService";
import prisma from "@/app/libs/prismadb";
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

  const updated = await prisma.tripExtension.update({
    where: { id: extensionId },
    data: { status: decision, respondedAt: new Date() },
  });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: decision === "APPROVED" ? "TRIP_EXTENSION_APPROVED" : "TRIP_EXTENSION_DECLINED",
    targetType: "TripExtension",
    targetId: extensionId,
    metadata: { reservationId },
  });

  try {
    if (decision === "APPROVED") {
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
