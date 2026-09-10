import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";

type Context = { params: Promise<{ reservationId: string }> };

const money = (value: number) => `AU$${Math.round(value).toLocaleString("en-AU")}`;
const day = (value: Date) =>
  new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(value);

async function GETHandler(_request: Request, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reservationId } = await context.params;
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      payment: true,
      listing: { select: { title: true, suburb: true, state: true, userId: true, user: { select: { name: true } } } },
    },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (![reservation.userId, reservation.listing.userId].includes(currentUser.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quote = (reservation.quoteSnapshot as { cleaningFee?: number } | null) ?? null;
  const cleaning = Math.max(0, Math.round(quote?.cleaningFee || 0));
  const isHost = currentUser.id === reservation.listing.userId && currentUser.id !== reservation.userId;

  // Guests see one all-in hire figure and their chosen add-ons — never a
  // platform fee line. Hosts see what the guest paid, Redrive's margin and
  // their payout.
  const guestHire = reservation.totalFees - reservation.insuranceFee - cleaning;
  const margin = Math.max(0, reservation.totalFees - reservation.totalPrice - reservation.insuranceFee - cleaning);
  const rows: [string, number][] = isHost
    ? [
        ["Guest paid", reservation.totalFees],
        ["Redrive service margin", margin],
        ...(reservation.insuranceFee > 0 ? [["Protection (retained by Redrive)", reservation.insuranceFee] as [string, number]] : []),
      ]
    : [
        ["Vehicle hire", guestHire],
        ...(reservation.insuranceFee > 0 ? [[`Protection · ${reservation.insuranceType}`, reservation.insuranceFee] as [string, number]] : []),
        ...(cleaning > 0 ? [["Cleaning fee", cleaning] as [string, number]] : []),
      ];

  const paidAt = reservation.paidAt ? day(reservation.paidAt) : null;
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redrive receipt · ${reservation.id}</title>
<style>
  *{box-sizing:border-box}
  body{font:14px/1.6 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111111;max-width:640px;margin:0 auto;padding:40px 24px}
  .bar{width:44px;height:4px;background:#eab308;border-radius:2px;margin-bottom:18px}
  h1{font-size:22px;margin:0 0 2px}
  .muted{color:#6e6e6e}
  table{width:100%;border-collapse:collapse;margin:22px 0}
  td{padding:8px 0;border-bottom:1px solid #ededed}
  td:last-child{text-align:right;font-variant-numeric:tabular-nums}
  .total td{border-bottom:0;border-top:2px solid #111111;font-weight:700;font-size:16px;padding-top:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;margin-top:18px}
  .k{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6e6e6e}
  .foot{margin-top:28px;font-size:12px;color:#9a9a9a}
  @media print{body{padding:0}.noprint{display:none}}
</style></head><body>
<div class="bar"></div>
<h1>Redrive booking receipt</h1>
<p class="muted">Reference ${reservation.id}${paidAt ? ` · paid ${paidAt}` : ` · ${reservation.status.toLowerCase()}`}</p>

<div class="grid">
  <div><div class="k">Vehicle</div>${reservation.listing.title}</div>
  <div><div class="k">Location</div>${[reservation.listing.suburb, reservation.listing.state].filter(Boolean).join(", ")}</div>
  <div><div class="k">Hire dates</div>${day(reservation.startDate)} – ${day(reservation.endDate)}</div>
  <div><div class="k">Host</div>${reservation.listing.user.name ?? "—"}</div>
  <div><div class="k">Guest</div>${reservation.user.name ?? "—"}${reservation.user.email ? `<br><span class="muted">${reservation.user.email}</span>` : ""}</div>
  <div><div class="k">Payment status</div>${(reservation.paymentStatus || "—").replace(/_/g, " ").toLowerCase()}</div>
</div>

<table>
  ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${money(value)}</td></tr>`).join("")}
  <tr class="total"><td>${isHost ? "Your payout" : "Total"}</td><td>${money(isHost ? reservation.totalPrice + cleaning : reservation.totalFees)}</td></tr>
</table>

<p class="foot">Amounts in Australian dollars. Redrive facilitates the booking and retains a service margin; the remainder is payable to the host as the vehicle hire amount. Retain this receipt for your records — contact support if you need a tax invoice.</p>
<p class="noprint foot">Tip: use your browser's Print function and choose "Save as PDF".</p>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
}

export const GET = monitorApiRoute("/api/reservations/[reservationId]/receipt", GETHandler, "GET");
