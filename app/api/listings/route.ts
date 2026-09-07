import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";
import { normalizeCancellationPolicy } from "@/app/libs/cancellationPolicy";
import {
  invalidatePublicListingsCache,
  getListingsPage,
  LISTINGS_PAGE_SIZE,
  type IListingsParams,
} from "@/app/actions/getListings";
import { toListingCardData } from "@/app/libs/listingCardData";
import { withApproxLocation } from "@/app/libs/suburbGeoData";
import { sanitizeListingExtras } from "@/app/libs/listingExtras";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";
import { internalError } from "@/app/libs/apiError";

async function POSTHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      title,
      description,
      imageSrcs = [],
      category,
      guestCount = 0,
      doorCount = 0,
      sleepCount = 0,
      company,
      modal,
      year,
      fuelType,
      fuelEconomy,
      driveChain,
      price,
      information,
      amenities = [],
      state,
      suburb,
      address,
      latitude,
      longitude,
      regoNumber,
      regoEndDate,
      regoImage = "",
      badge,
      cleaningFeeOption,
      cleaningFeeAmount,
      returnCleaningFeeAmount,
      cancellationPolicy,
    } = body;

    const parsedFuelEconomy = fuelEconomy ? parseFloat(fuelEconomy) : null;

    const finalAddress = address?.trim() !== "" ? address : "Unknown";

    const formattedRegoNumber = regoNumber
      ? regoNumber.toUpperCase()
      : "UNKNOWN";

    const formattedRegoEndDate = regoEndDate ? new Date(regoEndDate) : null;

    if (
      !title ||
      !description ||
      !category ||
      !company ||
      !modal ||
      !year ||
      !fuelType ||
      !driveChain ||
      !state ||
      !suburb ||
      price === undefined
    ) {
      console.error("❌ Error: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedPrice = isNaN(parseInt(price, 10)) ? 0 : parseInt(price, 10);
    const parsedYear = isNaN(parseInt(year, 10)) ? null : parseInt(year, 10);
    const parsedLatitude = latitude ? parseFloat(latitude) : null;
    const parsedLongitude = longitude ? parseFloat(longitude) : null;

    const parsedCleaningFeeAmount = cleaningFeeAmount ? parseInt(cleaningFeeAmount, 10) : null;
    const parsedReturnCleaningFeeAmount = returnCleaningFeeAmount ? parseInt(returnCleaningFeeAmount, 10) : null;

    const formattedAmenities = Array.isArray(amenities) ? amenities : [];

    // The first URL is always the main/cover photo; the remaining entries are
    // secondary photos. Keep this contract small, predictable and duplicate-free.
    const formattedImageSrcs = Array.isArray(imageSrcs)
      ? [...new Set(imageSrcs.filter((src): src is string => typeof src === "string" && src.trim().length > 0))]
      : [];
    if (formattedImageSrcs.length < 1 || formattedImageSrcs.length > 10) {
      return NextResponse.json(
        { error: "Add one main photo and no more than nine secondary photos" },
        { status: 400 }
      );
    }

    const formattedRegoImage = regoImage ? regoImage : null;

    const finalBadge = badge ?? null;

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        badge: finalBadge,
        imageSrcs: formattedImageSrcs,
        category,
        guestCount,
        doorCount,
        sleepCount,
        company,
        modal,
        year: parsedYear,
        fuelType,
        driveChain,
        fuelEconomy: parsedFuelEconomy,
        information,
        price: parsedPrice,
        state,
        suburb,
        address: finalAddress,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        userId: currentUser.id,
        amenities: formattedAmenities,
        regoNumber: formattedRegoNumber,
        regoEndDate: formattedRegoEndDate,
        regoImage: formattedRegoImage,
        cleaningFeeOption: cleaningFeeOption ?? null,
        cleaningFeeAmount: parsedCleaningFeeAmount,
        returnCleaningFeeAmount: parsedReturnCleaningFeeAmount,
        cancellationPolicy: normalizeCancellationPolicy(cancellationPolicy),
        ...sanitizeListingExtras(body),
        createdAt: new Date(),
      },
    });

    invalidatePublicListingsCache();

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    return internalError(error, { event: "listing_create_failed", route: "POST /api/listings" });
  }
}

// GET: one paginated page of public discovery results. Same filters as the
// /explore query string, plus `cursor` (id of the last card from the previous
// page). Returns compact card data only.
async function GETHandler(request: NextRequest) {
  try {
    // Public, unauthenticated discovery path — cap per IP to protect the DB.
    const rateLimit = await consumeRateLimits([
      { scope: "listings-search-ip", identifier: getClientIp(request), limit: 60, windowMs: 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const sp = request.nextUrl.searchParams;
    const str = (key: string) => sp.get(key) || undefined;

    const params: IListingsParams = {
      state: str("state"),
      suburb: str("suburb"),
      category: str("category"),
      information: str("information"),
      guestCount: str("guestCount") ? Number(sp.get("guestCount")) : undefined,
      sleepCount: str("sleepCount") ? Number(sp.get("sleepCount")) : undefined,
      minPrice: str("minPrice"),
      maxPrice: str("maxPrice"),
      startDate: str("startDate"),
      endDate: str("endDate"),
      transmission: str("transmission"),
      delivery: str("delivery"),
      petsAllowed: str("petsAllowed"),
      unsealed: str("unsealed"),
      cursor: str("cursor"),
      limit: str("limit") ? Number(sp.get("limit")) : LISTINGS_PAGE_SIZE,
      swLat: str("swLat"),
      swLng: str("swLng"),
      neLat: str("neLat"),
      neLng: str("neLng"),
    };

    const { listings, nextCursor } = await getListingsPage(params);

    return NextResponse.json(
      {
        listings: listings.map((listing) => withApproxLocation(toListingCardData(listing))),
        nextCursor,
      },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("GET /api/listings error", error);
    return NextResponse.json({ error: "Unable to load listings" }, { status: 500 });
  }
}

export const GET = monitorApiRoute("/api/listings", GETHandler, "GET");

export const POST = monitorApiRoute("/api/listings", POSTHandler, "POST");
