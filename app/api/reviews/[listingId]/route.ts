import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Override type checking for params
) {
  try {
    if (!context.params || !context.params.listingId) {
      // ✅ Prevent accessing undefined params
      return NextResponse.json(
        { error: "Invalid request: Missing listing ID" },
        { status: 400 }
      );
    }
    const { listingId } = context.params;

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
