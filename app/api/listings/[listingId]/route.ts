import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface IParams {
  listingId?: string;
}

/**
 * ✅ GET: Fetch a specific listing by ID (Includes amenities)
 */
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const listingId = context.params?.listingId;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    // ✅ Fetch listing with amenities stored in `Listing` table
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    console.log(
      "📤 Fetched Listing with Amenities:",
      JSON.stringify(listing, null, 2)
    );

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching listing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * ✅ PUT: Update a listing (Includes updating amenities)
 */
export async function PUT(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUser();
    const listingId = context.params?.listingId;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      information,
      category,
      imageSrc,
      guestCount,
      doorCount,
      sleepCount,
      year,
      fuelType,
      price,
      amenities,
    } = body;

    if (
      !title ||
      !description ||
      !category ||
      !imageSrc ||
      !year ||
      !fuelType ||
      !price
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formattedAmenities = Array.isArray(amenities) ? amenities : [];

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title,
        description,
        information,
        category,
        imageSrc,
        guestCount,
        doorCount,
        sleepCount,
        year: parseInt(year, 10),
        fuelType,
        price: parseFloat(price),
        amenities: formattedAmenities,
      },
    });

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating listing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE: Remove a listing
 */
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    const currentUser = await getCurrentUser();
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

    // ✅ Ensure the listing exists before deleting
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId: currentUser.id },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // ✅ Delete the listing
    await prisma.listing.delete({
      where: { id: listingId },
    });

    console.log(`✅ Listing ${listingId} deleted successfully`);

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
