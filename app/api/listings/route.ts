import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";

async function POSTHandler(request: NextRequest) {
  try {
    // ✅ Fetch current user
    const currentUser = await getCurrentUserEnhanced(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Parse request body
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
      fuelEconomy, // ✅ New field
      driveChain, // ✅ New field
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
      badge, // ✅ Default to empty string
      cleaningFeeOption,
      cleaningFeeAmount,
      returnCleaningFeeAmount,
    } = body;

    const parsedFuelEconomy = fuelEconomy ? parseFloat(fuelEconomy) : null; // ✅ Ensure float or null

    // ✅ Ensure valid address
    const finalAddress = address?.trim() !== "" ? address : "Unknown";

    // ✅ Ensure regoNumber is uppercase (avoid passing null)
    const formattedRegoNumber = regoNumber
      ? regoNumber.toUpperCase()
      : "UNKNOWN";

    // ✅ Convert regoEndDate string ("YYYY-MM-DD") to a Date object
    const formattedRegoEndDate = regoEndDate ? new Date(regoEndDate) : null;

    // ✅ Ensure required fields exist
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

    // ✅ Ensure numeric values are properly parsed
    const parsedPrice = isNaN(parseInt(price, 10)) ? 0 : parseInt(price, 10);
    const parsedYear = isNaN(parseInt(year, 10)) ? null : parseInt(year, 10);
    const parsedLatitude = latitude ? parseFloat(latitude) : null;
    const parsedLongitude = longitude ? parseFloat(longitude) : null;

    const parsedCleaningFeeAmount = cleaningFeeAmount ? parseInt(cleaningFeeAmount, 10) : null;
    const parsedReturnCleaningFeeAmount = returnCleaningFeeAmount ? parseInt(returnCleaningFeeAmount, 10) : null;

    // ✅ Ensure amenities is an array
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

    // ✅ Ensure regoImage is either a valid URL or null
    const formattedRegoImage = regoImage ? regoImage : null;

    // ✅ Ensure badge is explicitly set to `null` (It can be updated later)
    const finalBadge = badge ?? null;

    // ✅ Create listing with new fields
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        badge: finalBadge, // ✅ Ensure badge is explicitly included
        imageSrcs: formattedImageSrcs,
        category,
        guestCount,
        doorCount,
        sleepCount,
        company,
        modal,
        year: parsedYear,
        fuelType,
        driveChain, // ✅ Storing drive chain
        fuelEconomy: parsedFuelEconomy, // ✅ Storing fuel economy
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
        createdAt: new Date(),
      },
    });


    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const POST = monitorApiRoute("/api/listings", POSTHandler, "POST");
