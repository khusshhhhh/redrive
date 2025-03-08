import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  // Await context.params to ensure it is resolved
  const resolvedParams = await Promise.resolve(context.params);

  if (!resolvedParams || !resolvedParams.listingId) {
    return NextResponse.json(
      { error: "Invalid request: Missing listing ID" },
      { status: 400 }
    );
  }

  const { listingId } = resolvedParams;

  try {
    const reviews = await prisma.review.findMany({
      where: { listingId },
      include: { user: { select: { name: true, image: true } } },
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
