import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      console.error("❌ Unauthorized: No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      console.error("❌ User not found in DB");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      number: currentUser.number,
      dateOfBirth: currentUser.dateOfBirth,
      image: currentUser.image,
      streetAddress: currentUser.streetAddress,
      suburb: currentUser.suburb,
      state: currentUser.state,
      postcode: currentUser.postcode,
      hobbies: currentUser.hobbies,
      dreamDestinations: currentUser.dreamDestinations,
      licenseImage: currentUser.licenseImage,
      licenseType: currentUser.licenseType,
      profileVerified: currentUser.profileVerified,
      loginOtpEnabled: currentUser.loginOtpEnabled,
      hasPassword: Boolean(currentUser.hashedPassword),
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
    });
  } catch (error) {
    console.error("❌ Error fetching current user:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
