import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.keys(body).forEach((value: any) => {
    if (!body[value]) {
      NextResponse.error();
    }
  });

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

  return NextResponse.json(listing);
}
