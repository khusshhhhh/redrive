import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

const objectIds = (value: string | null) => (value || "").split(",").filter((id) => /^[a-f\d]{24}$/i.test(id)).slice(0, 8);
const validDate = (value: string | null) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;

async function GETHandler(request: NextRequest) {
  // Open to visitors and does a 60-row scan + scoring — cap by IP.
  const rateLimit = await consumeRateLimits([
    { scope: "recommendations-ip", identifier: getClientIp(request), limit: 40, windowMs: 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const currentUser = await getCurrentUserEnhanced(request);
  const viewedIds = objectIds(request.nextUrl.searchParams.get("viewed"));
  const startDate = validDate(request.nextUrl.searchParams.get("startDate"));
  const endDate = validDate(request.nextUrl.searchParams.get("endDate"));
  const requestedState = request.nextUrl.searchParams.get("state")?.slice(0, 20) || null;
  const requestedSuburb = request.nextUrl.searchParams.get("suburb")?.slice(0, 80) || null;

  const user = currentUser ? await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { id: true, state: true, suburb: true, favoriteIds: true },
  }) : null;
  const affinityIds = [...new Set([...(user?.favoriteIds || []), ...viewedIds])].slice(0, 16);
  const affinityListings = affinityIds.length ? await prisma.listing.findMany({
    where: { id: { in: affinityIds } },
    select: { category: true, company: true, state: true, suburb: true },
  }) : [];
  const preferredCategories = new Set(affinityListings.map((listing) => listing.category));
  const preferredCompanies = new Set(affinityListings.map((listing) => listing.company));
  const targetState = requestedState || user?.state || affinityListings[0]?.state || null;
  const targetSuburb = requestedSuburb || user?.suburb || affinityListings[0]?.suburb || null;

  const candidates = await prisma.listing.findMany({
    where: {
      ...(currentUser ? { userId: { not: currentUser.id } } : {}),
      ...(affinityIds.length ? { id: { notIn: affinityIds } } : {}),
      ...(startDate && endDate ? {
        NOT: { reservations: { some: { status: { in: ["REVIEWING", "APPROVED", "ACTIVE"] }, startDate: { lte: endDate }, endDate: { gte: startDate } } } },
      } : {}),
    },
    include: {
      user: { select: { profileVerified: true, responseTimeHours: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const ranked = candidates.map((listing) => {
    const reviewAverage = listing.reviewAverage ?? 0;
    let score = 0;
    const reasons: string[] = [];

    if (targetSuburb && listing.suburb.toLowerCase() === targetSuburb.toLowerCase()) { score += 8; reasons.push(`Near ${targetSuburb}`); }
    else if (targetState && listing.state === targetState) { score += 4; reasons.push(`In ${targetState}`); }
    if (preferredCategories.has(listing.category)) { score += 6; reasons.push(`Similar ${listing.category.toLowerCase()} to vehicles you viewed or saved`); }
    if (preferredCompanies.has(listing.company)) score += 2;
    if (listing.user.profileVerified === "Y") { score += 2; reasons.push("Verified host"); }
    if ((listing.reviewCount ?? 0) >= 3 && reviewAverage >= 4) { score += 3; reasons.push(`${reviewAverage.toFixed(1)} rating`); }
    if (listing.instantBook) score += 1;
    if (startDate && endDate) { score += 3; reasons.unshift("Available for your dates"); }

    const { user, ...publicListing } = listing;
    return {
      score,
      listing: {
        ...publicListing,
        address: "",
        latitude: null,
        longitude: null,
        regoNumber: null,
        regoEndDate: null,
        regoImage: "",
        createdAt: listing.createdAt.toISOString(),
        lastServicedAt: listing.lastServicedAt ? listing.lastServicedAt.toISOString() : null,
        reviewAverage: listing.reviewAverage ?? 0,
        reviewCount: listing.reviewCount ?? 0,
        hostVerified: user.profileVerified === "Y",
        hostResponseHours: user.responseTimeHours,
        recommendationReason: reasons.slice(0, 2).join(" · ") || "Recently added on Redrive",
      },
    };
  }).sort((a, b) => b.score - a.score || (b.listing.reviewCount ?? 0) - (a.listing.reviewCount ?? 0));

  return NextResponse.json(ranked.slice(0, 6).map((item) => item.listing), { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = monitorApiRoute("/api/recommendations", GETHandler, "GET");
