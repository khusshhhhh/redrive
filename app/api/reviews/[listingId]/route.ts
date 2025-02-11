import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const { listingId } = params;

    const reviews = await prisma.review.findMany({
      where: { listingId },
      include: { user: { select: { name: true, image: true } } }, // Include user details
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
