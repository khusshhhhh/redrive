import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import { getAdminUser } from "@/app/libs/adminAuth";
import prisma from "@/app/libs/prismadb";

async function GETHandler(request: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "open";
  const where =
    scope === "all"
      ? {}
      : scope === "escalated"
        ? { status: "ESCALATED" }
        : { status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] } };

  const incidents = await prisma.incidentCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const reservationIds = Array.from(new Set(incidents.map((incident) => incident.reservationId)));
  const reservations = reservationIds.length
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          totalFees: true,
          paymentStatus: true,
          user: { select: { name: true, email: true } },
          listing: { select: { title: true, securityDeposit: true, user: { select: { name: true, email: true } } } },
        },
      })
    : [];
  const byId = Object.fromEntries(reservations.map((reservation) => [reservation.id, reservation]));

  return NextResponse.json(
    incidents.map((incident) => ({ ...incident, reservation: byId[incident.reservationId] ?? null })),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const GET = monitorApiRoute("/api/admin/incidents", GETHandler, "GET");
