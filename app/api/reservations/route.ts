import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// ✅ Function to determine service fee based on total price
const calculateServiceFee = (totalPrice: number): number => {
  if (totalPrice <= 200) return 10;
  if (totalPrice <= 400) return 25;
  if (totalPrice <= 800) return 40;
  if (totalPrice <= 1200) return 60;
  if (totalPrice <= 2000) return 80;
  return 100;
};

// ✅ POST: Create a reservation
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Received reservation data:", body); // ✅ Log the request body

    const {
      listingId,
      startDate,
      endDate,
      totalPrice,
      insuranceType,
      insuranceFee,
    } = body;

    if (!listingId || !startDate || !endDate || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure `insuranceType` and `insuranceFee` are properly handled
    const finalInsuranceType = insuranceType || "No Insurance"; // Default if not provided
    const finalInsuranceFee = insuranceFee || 0;

    console.log(
      "Insurance Selected:",
      finalInsuranceType,
      "Fee:",
      finalInsuranceFee
    ); // ✅ Log insurance details

    const redriveFee = Math.round(totalPrice * 0.08);
    const serviceFee = calculateServiceFee(totalPrice);
    const totalFees = totalPrice + redriveFee + serviceFee + finalInsuranceFee;

    const reservation = await prisma.reservation.create({
      data: {
        userId: currentUser.id,
        listingId,
        startDate,
        endDate,
        totalPrice,
        redriveFee,
        serviceFee,
        insuranceType: finalInsuranceType,
        insuranceFee: finalInsuranceFee,
        totalFees,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
