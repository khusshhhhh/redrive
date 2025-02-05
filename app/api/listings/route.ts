import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    console.log("✅ Received request body:", JSON.stringify(body, null, 2)); // ✅ Debug log

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

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
    } = body;

    console.log("🔍 Extracted values:", {
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
    });

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
        year,
        fuelType,
        locationValue: location.value,
        price: parseInt(price, 10),
        userId: currentUser.id,
      },
    });

    console.log("✅ Listing created successfully:", listing);

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating listing:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
