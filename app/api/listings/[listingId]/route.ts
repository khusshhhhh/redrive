import { NextResponse } from "next/server";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";

/**
 * ✅ GET: Fetch a specific listing by ID (Includes state, suburb, amenities, images, and rego details)
 */
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  try {
    const listingId = context.params.listingId;

    if (!listingId) {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { user: true }, // Fetch owner details if needed
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ PUT: Update listing (Supports multiple images, rego details, state, suburb, and address)
 */
export async function PUT(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    const listingId = context.params.listingId;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!listingId) {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      information,
      category,
      imageSrcs,
      guestCount,
      doorCount,
      sleepCount,
      year,
      fuelType,
      price,
      amenities,
      state,
      suburb,
      address,
      latitude,
      longitude,
      regoNumber,
      regoEndDate,
      regoImage,
      cleaningFeeOption,
      cleaningFeeAmount,
      returnCleaningFeeAmount,
    } = body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !category ||
      !imageSrcs ||
      !year ||
      !fuelType ||
      !price ||
      !state ||
      !suburb ||
      !address
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formattedImageSrcs = Array.isArray(imageSrcs)
      ? [...new Set(imageSrcs.filter((src): src is string => typeof src === "string" && src.trim().length > 0))]
      : [];

    // Index zero is the main/cover photo. The rest are the nine secondaries.
    if (formattedImageSrcs.length < 1 || formattedImageSrcs.length > 10) {
      return NextResponse.json(
        { error: "Add one main photo and no more than nine secondary photos" },
        { status: 400 }
      );
    }

    const existingListing = await prisma.listing.findUnique({ where: { id: listingId }, select: { userId: true } });
    if (!existingListing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    if (existingListing.userId !== currentUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title,
        description,
        information,
        category,
        imageSrcs: formattedImageSrcs,
        guestCount,
        doorCount,
        sleepCount,
        year: parseInt(year, 10),
        fuelType,
        price: parseFloat(price),
        amenities: Array.isArray(amenities) ? amenities : [],
        state,
        suburb,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        regoNumber,
        regoEndDate: regoEndDate ? new Date(regoEndDate) : null, // Ensure valid date
        regoImage, // Update single rego image
        cleaningFeeOption: cleaningFeeOption ?? null,
        cleaningFeeAmount: cleaningFeeAmount ? parseInt(cleaningFeeAmount, 10) : null,
        returnCleaningFeeAmount: returnCleaningFeeAmount ? parseInt(returnCleaningFeeAmount, 10) : null,
      },
    });

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE: Remove a listing (Ensures only the owner can delete it)
 */
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);
    const listingId = context.params.listingId;

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    // Check if the listing exists and belongs to the current user
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this listing" },
        { status: 403 }
      );
    }

    // Delete the listing
    await prisma.listing.delete({
      where: { id: listingId },
    });


    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
