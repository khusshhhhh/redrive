import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  try {
    // ✅ Fetch current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("❌ Error: Unauthorized request. No user found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Parse request body
    const body = await request.json();
    console.log("📥 Received request body:", body);

    const {
      title,
      description,
      imageSrc,
      category,
      guestCount,
      doorCount,
      sleepCount,
      company,
      modal,
      year,
      fuelType,
      location,
      price,
      information,
      createdAt,
      amenities, // ✅ New field for storing amenities in the listing table
    } = body;

    // ✅ Validate required fields
    if (
      !title ||
      !description ||
      !imageSrc ||
      !category ||
      !company ||
      !modal ||
      !year ||
      !fuelType ||
      !location ||
      !price
    ) {
      console.error("❌ Error: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Ensure valid numeric values
    const parsedPrice = parseInt(price, 10);
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedPrice) || isNaN(parsedYear)) {
      console.error("❌ Error: Invalid numeric values in price or year");
      return NextResponse.json(
        { error: "Invalid numeric values" },
        { status: 400 }
      );
    }

    // ✅ Ensure amenities is an array
    const formattedAmenities = Array.isArray(amenities) ? amenities : [];

    // ✅ Create listing with amenities stored in the `amenities` column
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        imageSrc,
        category,
        guestCount,
        doorCount,
        sleepCount,
        company,
        modal,
        year: parsedYear,
        fuelType,
        information,
        locationValue: location.value,
        price: parsedPrice,
        userId: currentUser.id,
        amenities: formattedAmenities, // ✅ Store amenities directly as an array
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });

    console.log("✅ Listing created successfully with amenities:", listing);

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
