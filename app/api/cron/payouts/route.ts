import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import { releaseReservationPayment } from "@/app/libs/payments";
import prisma from "@/app/libs/prismadb";

async function GETHandler(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (
    !expected ||
    request.headers.get("authorization") !== `Bearer ${expected}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const candidates = await prisma.payment.findMany({
    where: {
      OR: [
        { status: "PAID_HELD", reservation: { endDate: { lte: new Date() } } },
        { status: "CANCELLATION_PAYOUT_PENDING", cancellationPayoutDueAt: { lte: new Date() } },
      ],
    },
    select: { reservationId: true },
    take: 100,
    orderBy: { createdAt: "asc" },
  });
  const results = await Promise.all(
    candidates.map(({ reservationId }) =>
      releaseReservationPayment(reservationId),
    ),
  );
  return NextResponse.json({
    checked: candidates.length,
    released: results.filter((result) => result.released).length,
  });
}

export const GET = monitorApiRoute("/api/cron/payouts", GETHandler, "GET");
