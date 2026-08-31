import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { getAdminUser } from "@/app/libs/adminAuth";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { captureDeposit, releaseDeposit } from "@/app/libs/deposit";
import { releaseReservationPayment } from "@/app/libs/payments";
import { notificationService } from "@/app/services/notificationService";
import { writeAuditEvent } from "@/app/libs/security";

type Context = { params: Promise<{ reservationId: string; incidentId: string }> };

const OUTCOMES = ["NO_ACTION", "DEPOSIT_DEDUCTION", "PARTIAL_REFUND", "GOODWILL", "ESCALATED"];

async function PATCHHandler(request: Request, context: Context) {
  const { reservationId, incidentId } = await context.params;
  const user = await getCurrentUserEnhanced(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [incident, reservation, adminUser] = await Promise.all([
    prisma.incidentCase.findUnique({ where: { id: incidentId } }),
    prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, listing: { select: { userId: true, title: true } } },
    }),
    getAdminUser(),
  ]);
  if (!incident || incident.reservationId !== reservationId || !reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parties = [reservation.userId, reservation.listing.userId];
  const isAdmin = Boolean(adminUser);
  if (!parties.includes(user.id) && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  // --- The other party adds their statement ------------------------------
  if (action === "RESPOND") {
    if (user.id === incident.reporterUserId) {
      return NextResponse.json({ error: "You opened this case" }, { status: 409 });
    }
    const statement = typeof body.statement === "string" ? body.statement.trim() : "";
    if (statement.length < 10 || statement.length > 3000) {
      return NextResponse.json({ error: "Add your account in 10 to 3000 characters" }, { status: 400 });
    }
    const updated = await prisma.incidentCase.update({
      where: { id: incidentId },
      data: {
        responderUserId: user.id,
        responderStatement: statement,
        respondedAt: new Date(),
        status: incident.status === "OPEN" ? "UNDER_REVIEW" : incident.status,
      },
    });
    await notificationService
      .notifySecurityAlert(
        incident.reporterUserId,
        "The other party responded",
        `There's a new response on the issue you reported for ${reservation.listing.title}.`,
        `/reservations/${reservationId}`,
      )
      .catch(() => undefined);
    await writeAuditEvent({
      request,
      actorUserId: user.id,
      action: "INCIDENT_RESPONSE_ADDED",
      targetType: "IncidentCase",
      targetId: incidentId,
    });
    return NextResponse.json(updated);
  }

  // --- Close the case -------------------------------------------------------
  if (action === "RESOLVE" || action === "ESCALATE") {
    // Either party can mutually resolve with NO_ACTION; anything with a money
    // outcome, or an escalation, is admin-only.
    const outcome =
      typeof body.outcome === "string" && OUTCOMES.includes(body.outcome)
        ? body.outcome
        : action === "ESCALATE"
          ? "ESCALATED"
          : "NO_ACTION";
    // Parties can mutually close with nothing owed, or hand it to support.
    // Anything with a money outcome is support-only.
    const needsAdmin = outcome === "DEPOSIT_DEDUCTION" || outcome === "PARTIAL_REFUND" || outcome === "GOODWILL";
    if (needsAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "A money outcome must be actioned by Redrive support" },
        { status: 403 },
      );
    }
    const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 3000) : "";
    if (resolution.length < 5) {
      return NextResponse.json({ error: "Add a short resolution note" }, { status: 400 });
    }

    const status = action === "ESCALATE" ? "ESCALATED" : "RESOLVED";
    const updated = await prisma.incidentCase.update({
      where: { id: incidentId },
      data: {
        status,
        resolution,
        resolutionOutcome: outcome,
        resolutionAmount:
          typeof body.amount === "number" && body.amount > 0 ? Math.round(body.amount) : null,
        resolvedByUserId: user.id,
        resolvedAt: new Date(),
      },
    });

    await writeAuditEvent({
      request,
      actorUserId: user.id,
      action: action === "ESCALATE" ? "INCIDENT_ESCALATED" : "INCIDENT_RESOLVED",
      targetType: "IncidentCase",
      targetId: incidentId,
      metadata: { outcome, amount: updated.resolutionAmount ?? 0 },
    });

    for (const partyId of parties) {
      await notificationService
        .notifySystemUpdate(
          partyId,
          status === "RESOLVED" ? "Trip issue resolved" : "Trip issue escalated to support",
          resolution.slice(0, 160),
          `/reservations/${reservationId}`,
        )
        .catch(() => undefined);
    }

    // A money outcome captures part of the held deposit.
    if (status === "RESOLVED" && outcome === "DEPOSIT_DEDUCTION" && updated.resolutionAmount) {
      await captureDeposit(reservationId, updated.resolutionAmount).catch((error) =>
        console.error("Deposit capture failed", error),
      );
    }

    // A clean resolution unblocks a held payout and releases the deposit.
    if (status === "RESOLVED") {
      const stillOpen = await prisma.incidentCase.count({
        where: { reservationId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
      });
      if (stillOpen === 0) {
        if (outcome === "NO_ACTION" || outcome === "GOODWILL") {
          await releaseDeposit(reservationId).catch((error) =>
            console.error("Deposit release failed", error),
          );
        }
        await releaseReservationPayment(reservationId).catch((error) =>
          console.error("Post-incident payout release failed", error),
        );
      }
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const PATCH = monitorApiRoute(
  "/api/reservations/[reservationId]/incidents/[incidentId]",
  PATCHHandler,
  "PATCH",
);
