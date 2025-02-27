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
      city,
      state,
      postcode,
      hobbies,
      dreamDestinations,
      image,
    } = body;

    // Ensure all fields are mapped correctly
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name ?? "",
        number: number ?? "",
        streetAddress: streetAddress ?? "",
        city: city ?? "",
        state: state ?? "",
        postcode: postcode ?? "",
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        dreamDestinations: Array.isArray(dreamDestinations)
          ? dreamDestinations
          : [],
        image: image ?? "",
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
