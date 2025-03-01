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
      imageSrcs = [],
      category,
      guestCount = 0,
      doorCount = 0,
      sleepCount = 0,
      company,
      modal,
      year,
      fuelType,
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
    } = body;

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

    // ✅ Ensure amenities is an array
    const formattedAmenities = Array.isArray(amenities) ? amenities : [];

    // ✅ Ensure imageSrcs is an array
    const formattedImageSrcs = Array.isArray(imageSrcs) ? imageSrcs : [];

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
