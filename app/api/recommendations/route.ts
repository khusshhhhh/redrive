import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";

const objectIds = (value: string | null) => (value || "").split(",").filter((id) => /^[a-f\d]{24}$/i.test(id)).slice(0, 8);
const validDate = (value: string | null) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;

async function GETHandler(request: NextRequest) {
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
      user: { select: { profileVerified: true } },
      reviews: { select: { rating: true } },
      reservations: { where: { respondedAt: { not: null } }, select: { createdAt: true, respondedAt: true }, orderBy: { respondedAt: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const ranked = candidates.map((listing) => {
    const reviewAverage = listing.reviews.length ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / listing.reviews.length : 0;
    const responseHours = listing.reservations.flatMap((reservation) => reservation.respondedAt ? [(reservation.respondedAt.getTime() - reservation.createdAt.getTime()) / 3_600_000] : []);
    let score = 0;
    const reasons: string[] = [];

    if (targetSuburb && listing.suburb.toLowerCase() === targetSuburb.toLowerCase()) { score += 8; reasons.push(`Near ${targetSuburb}`); }
    else if (targetState && listing.state === targetState) { score += 4; reasons.push(`In ${targetState}`); }
    if (preferredCategories.has(listing.category)) { score += 6; reasons.push(`Similar ${listing.category.toLowerCase()} to vehicles you viewed or saved`); }
    if (preferredCompanies.has(listing.company)) score += 2;
    if (listing.user.profileVerified === "Y") { score += 2; reasons.push("Verified host"); }
    if (listing.reviews.length >= 3 && reviewAverage >= 4) { score += 3; reasons.push(`${reviewAverage.toFixed(1)} rating`); }
    if (listing.instantBook) score += 1;
    if (startDate && endDate) { score += 3; reasons.unshift("Available for your dates"); }

    const { user: _user, reviews: _reviews, reservations: _reservations, ...publicListing } = listing;
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
        reviewAverage: Math.round(reviewAverage * 10) / 10,
        reviewCount: listing.reviews.length,
        hostVerified: listing.user.profileVerified === "Y",
        hostResponseHours: responseHours.length ? Math.round((responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length) * 10) / 10 : null,
        recommendationReason: reasons.slice(0, 2).join(" · ") || "Recently added on Redrive",
      },
    };
  }).sort((a, b) => b.score - a.score || b.listing.reviewCount - a.listing.reviewCount);

  return NextResponse.json(ranked.slice(0, 6).map((item) => item.listing), { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = monitorApiRoute("/api/recommendations", GETHandler, "GET");
