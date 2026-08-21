import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import type { NextRequest } from "next/server";

/**
 * ✅ GET: Fetch a user by ID
 */
async function GETHandler(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
) {
  try {
    const userId = context.params?.userId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        suburb: true,
        state: true,
        profileVerified: true,
        createdAt: true,
        listings: {
          select: {
            id: true,
            title: true,
            imageSrcs: true,
            category: true,
            price: true,
            state: true,
            suburb: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = monitorApiRoute("/api/profile/[userId]", GETHandler, "GET");
