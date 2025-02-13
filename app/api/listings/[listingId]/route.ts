import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

/**
 * ✅ GET: Fetch a specific listing by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { listingId?: string } }
) {
  try {
    const listingId = params?.listingId;

    if (!listingId) {
      return NextResponse.json(
        { error: "Missing listing ID" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing, { status: 200 });
  } catch (error) {
    console.error("Error fetching listing:", error);
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
  { params }: { params: { listingId?: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    const listingId = params?.listingId;

    if (!listingId) {
      return NextResponse.json(
        { error: "Missing listing ID" },
        { status: 400 }
      );
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      if (!body || Object.keys(body).length === 0) {
        return NextResponse.json(
          { error: "Empty request body" },
          { status: 400 }
        );
      }
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
      category,
      imageSrc,
      guestCount,
      doorCount, // ✅ Ensure `doorCount` is included
      sleepCount,
      year,
      fuelType,
      price,
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

    // ✅ Ensure the listing exists and belongs to the current user
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

    // ✅ Update the listing (with `doorCount` included)
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title,
        description,
        category,
        imageSrc,
        guestCount: guestCount ?? 0, // Ensures default values
        doorCount: doorCount ?? 0, // ✅ Ensure doorCount is updated properly
        sleepCount: sleepCount ?? 0,
        year: parseInt(year, 10), // Convert year to integer
        fuelType,
        price: parseFloat(price), // Convert price to float
      },
    });

    return NextResponse.json(updatedListing, { status: 200 });
  } catch (error) {
    console.error("Error updating listing:", error);
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
  request: NextRequest,
  context: { params: { listingId?: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    const listingId = context.params?.listingId; // ✅ Correctly extract params

    if (!listingId) {
      console.error("❌ Error: Missing listing ID in request params");
      return NextResponse.json(
        { error: "Missing listing ID" },
        { status: 400 }
      );
    }

    if (!currentUser) {
      console.error("❌ Error: Unauthorized access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Ensure the listing exists and belongs to the current user
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.userId !== currentUser.id) {
      console.error("❌ Error: Forbidden - User does not own this listing");
      return NextResponse.json(
        { error: "Forbidden: You do not own this listing" },
        { status: 403 }
      );
    }

    // ✅ Check for dependent records (e.g., reservations)
    const existingReservations = await prisma.reservation.findMany({
      where: { listingId },
    });

    if (existingReservations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete listing with active reservations" },
        { status: 400 }
      );
    }

    // ✅ Delete the listing
    await prisma.listing.delete({ where: { id: listingId } });

    console.log(`✅ Listing ${listingId} deleted successfully`);
    return NextResponse.json(
      { success: true, message: "Listing deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
