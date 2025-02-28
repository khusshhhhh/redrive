import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  try {
    // ✅ Fetch current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Parse request body
    const body = await request.json();
    console.log("📥 Received request body:", JSON.stringify(body, null, 2));

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
      price,
      information,
      amenities,
      state,
      suburb,
      address,
      latitude,
      longitude,
      regoNumber,
      regoEndDate,
      regoImage,
    } = body;

    // ✅ Ensure address is not empty
    const finalAddress = address?.trim() !== "" ? address : "Unknown";

    // ✅ Ensure regoNumber is uppercase
    const formattedRegoNumber = regoNumber?.toUpperCase();

    // ✅ Convert regoEndDate string ("YYYY-MM-DD") to a Date object
    const formattedRegoEndDate = regoEndDate ? new Date(regoEndDate) : null;

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

    // ✅ Ensure valid numeric values
    const parsedPrice = parseInt(price, 10);
    const parsedYear = parseInt(year, 10);
    const parsedLatitude = latitude ? parseFloat(latitude) : null;
    const parsedLongitude = longitude ? parseFloat(longitude) : null;

    if (isNaN(parsedPrice) || isNaN(parsedYear)) {
      return NextResponse.json(
        { error: "Invalid numeric values" },
        { status: 400 }
      );
    }

    // ✅ Ensure amenities is an array
    const formattedAmenities = Array.isArray(amenities) ? amenities : [];

    // ✅ Store `badge` as `null` initially
    const finalBadge = null;

    // ✅ Create listing with new fields
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        badge: finalBadge, // ✅ Stores null by default
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
        regoImage,
        createdAt: new Date(),
      },
    });

    console.log(
      "✅ Listing created successfully:",
      JSON.stringify(listing, null, 2)
    );

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
