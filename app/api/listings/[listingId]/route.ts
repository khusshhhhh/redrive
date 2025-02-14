import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

interface IParams {
  listingId?: string;
}

/**
 * ✅ GET: Fetch a specific listing by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: IParams }
) {
  try {
    const { listingId } = await params; // ✅ Ensure correct destructuring

    // Validate listingId
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    // Fetch the listing from the database
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

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
 * ✅ PUT: Update a listing (Only owner can update)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: IParams }
) {
  try {
    const currentUser = await getCurrentUser();
    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

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
    } = body;

    if (
      !title ||
      !description ||
      !category ||
      !information ||
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

    // ✅ Find the listing and ensure it belongs to the current user
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (existingListing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this listing" },
        { status: 403 }
      );
    }

    // ✅ Update the listing
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title,
        description,
        information,
        category,
        imageSrc,
        guestCount: guestCount ?? 0,
        doorCount: doorCount ?? 0,
        sleepCount: sleepCount ?? 0,
        year: parseInt(year, 10),
        fuelType,
        price: parseFloat(price),
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
 * ✅ DELETE: Remove a listing (Only owner can delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  try {
    const currentUser = await getCurrentUser();
    const { listingId } = params;

    // ✅ Check if user is authenticated
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Validate listingId before using it
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Invalid listing ID" },
        { status: 400 }
      );
    }

    // ✅ Ensure the listing exists before trying to delete it
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

    // ✅ Ensure NextResponse.json() never receives null
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
