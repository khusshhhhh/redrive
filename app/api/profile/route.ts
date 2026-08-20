import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  isValidAustralianMobile,
  isValidDateOfBirth,
  normalizeAustralianMobile,
} from "@/app/libs/profileValidation";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      number,
      dateOfBirth,
      streetAddress,
      suburb,
      state,
      postcode,
      hobbies,
      dreamDestinations,
      image,
    } = body;

    if (number && !isValidAustralianMobile(number)) {
      return NextResponse.json(
        { error: "Enter a valid Australian mobile number" },
        { status: 400 }
      );
    }

    if (dateOfBirth && !isValidDateOfBirth(dateOfBirth)) {
      return NextResponse.json(
        { error: "Enter a valid date of birth" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, dateOfBirth: true, licenseStatus: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const verifiedIdentityChanged = existingUser.licenseStatus === "VERIFIED" &&
      ((name ?? "") !== (existingUser.name ?? "") ||
        (dateOfBirth ?? "") !== (existingUser.dateOfBirth ?? ""));

    // Update the user profile in the database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name ?? "",
        number: number ? normalizeAustralianMobile(number) : "",
        dateOfBirth: dateOfBirth ?? "",
        streetAddress: streetAddress ?? "",
        suburb: suburb ?? "",
        state: state ?? "",
        postcode: postcode ?? "",
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        dreamDestinations: Array.isArray(dreamDestinations)
          ? dreamDestinations
          : [],
        image: image ?? "",
        ...(verifiedIdentityChanged ? {
          licenseStatus: "DETAILS_MISMATCH",
          licenseNameMatches: false,
          licenseDobMatches: false,
          licenseVerifiedAt: null,
          licenseRejectionReason: "Your profile name or date of birth changed after the licence check. Check the licence again.",
          profileVerified: "N",
        } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        number: true,
        dateOfBirth: true,
        image: true,
        streetAddress: true,
        suburb: true,
        state: true,
        postcode: true,
        hobbies: true,
        dreamDestinations: true,
        profileVerified: true,
        licenseStatus: true,
        licenseExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
