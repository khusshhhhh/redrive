import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      number,
      streetAddress,
      suburb,
      state,
      postcode,
      hobbies,
      dreamDestinations,
      image,
      licenseType,
      licenseImage,
    } = body;

    // Determine if the profile should be verified
    const profileVerified = licenseImage ? "Y" : undefined;

    // Update the user profile in the database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name ?? "",
        number: number ?? "",
        streetAddress: streetAddress ?? "",
        suburb: suburb ?? "",
        state: state ?? "",
        postcode: postcode ?? "",
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        dreamDestinations: Array.isArray(dreamDestinations)
          ? dreamDestinations
          : [],
        image: image ?? "",
        profileVerified: profileVerified ?? undefined, // Update only if license uploaded
        licenseImage: licenseImage ?? "",
        licenseType: licenseType ?? "",
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    return NextResponse.json(
      {
        error: "Failed to update profile",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
