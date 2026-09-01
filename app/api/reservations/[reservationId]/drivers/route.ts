import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { notificationService } from "@/app/services/notificationService";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string }> };

const ROLE_ORDER = ["PRIMARY", "SECONDARY", "THIRD", "FOURTH"];

async function POSTHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;

  const rateLimit = await consumeRateLimits([
    { scope: "add-driver", identifier: currentUser.id, limit: 15, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true, status: true, listing: { select: { userId: true, title: true } } },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reservation.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the guest can add drivers" }, { status: 403 });
  }
  if (!["APPROVED", "ACTIVE"].includes(reservation.status)) {
    return NextResponse.json({ error: "Drivers can only be added to an upcoming or active trip" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const frontPublicId = typeof body.frontPublicId === "string" ? body.frontPublicId : "";
  if (name.length < 2 || !frontPublicId) {
    return NextResponse.json({ error: "Add the driver's name and a photo of their licence" }, { status: 400 });
  }

  const check = await prisma.licenceCheck.findFirst({
    where: { frontPublicId, ownerUserId: currentUser.id, expiresAt: { gt: new Date() } },
  });
  if (!check || !check.looksAustralian) {
    return NextResponse.json(
      { error: "Re-upload the licence — it didn't pass the Australian licence check or the upload has expired.", code: "DRIVER_LICENCE_REQUIRED" },
      { status: 400 },
    );
  }

  const existing = await prisma.reservationDriver.findMany({
    where: { reservationId },
    select: { role: true },
  });
  const nextRole = ROLE_ORDER.find((role) => !existing.some((d) => d.role === role));
  if (!nextRole) return NextResponse.json({ error: "This trip already has the maximum drivers" }, { status: 409 });

  const driver = await prisma.reservationDriver.create({
    data: {
      reservationId,
      role: nextRole,
      name: name.slice(0, 120),
      licenceImagePublicId: check.frontPublicId,
      licenceBackImagePublicId: check.backPublicId,
      looksAustralian: check.looksAustralian,
      detectedState: check.detectedState,
      addedAfterBooking: true,
    },
  });
  await prisma.licenceCheck.deleteMany({ where: { frontPublicId } });

  await writeAuditEvent({
    request,
    actorUserId: currentUser.id,
    action: "RESERVATION_DRIVER_ADDED",
    targetType: "ReservationDriver",
    targetId: driver.id,
    metadata: { reservationId, role: nextRole },
  });

  await notificationService
    .notifySystemUpdate(
      reservation.listing.userId,
      "Driver added",
      `${currentUser.name || "Your guest"} added ${name} as a driver on the ${reservation.listing.title} trip.`,
      `/reservations/${reservationId}`,
    )
    .catch(() => undefined);

  return NextResponse.json(driver, { status: 201 });
}

async function DELETEHandler(request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservationId } = await context.params;
  const driverId = new URL(request.url).searchParams.get("id") || "";

  const driver = await prisma.reservationDriver.findUnique({
    where: { id: driverId },
    include: { reservation: { select: { userId: true } } },
  });
  if (!driver || driver.reservationId !== reservationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (driver.reservation.userId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (driver.role === "PRIMARY" || !driver.addedAfterBooking) {
    return NextResponse.json({ error: "Only a driver you added after booking can be removed" }, { status: 409 });
  }
  await prisma.reservationDriver.delete({ where: { id: driverId } });
  return NextResponse.json({ removed: true });
}

export const POST = monitorApiRoute("/api/reservations/[reservationId]/drivers", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/reservations/[reservationId]/drivers", DELETEHandler, "DELETE");
