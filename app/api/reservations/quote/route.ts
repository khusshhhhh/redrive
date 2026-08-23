import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { buildBookingQuote } from "@/app/libs/booking";
import { cancellationPolicySnapshot } from "@/app/libs/cancellationPolicy";

async function POSTHandler(request: Request) {
  const user = await getCurrentUserEnhanced(request); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})); const startDate = new Date(body.startDate); const endDate = new Date(body.endDate);
  if (!body.listingId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return NextResponse.json({ error: "Invalid quote request" }, { status: 400 });
  const listing = await prisma.listing.findUnique({ where: { id: body.listingId }, select: { price: true, cleaningFeeOption: true, cleaningFeeAmount: true, cancellationPolicy: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  const quote = buildBookingQuote({ dailyRate: listing.price, startDate, endDate, insuranceType: body.insuranceType, cleaningFee: listing.cleaningFeeOption === "YES" ? listing.cleaningFeeAmount || 0 : 0 });
  return NextResponse.json({ ...quote, cancellationPolicy: cancellationPolicySnapshot(listing.cancellationPolicy), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = monitorApiRoute("/api/reservations/quote", POSTHandler, "POST");
