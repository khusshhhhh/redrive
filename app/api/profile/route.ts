import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  isValidAustralianMobile,
  isValidDateOfBirth,
  normalizeAustralianMobile,
} from "@/app/libs/profileValidation";
import { hasSubmittedLicense } from "@/app/libs/licenseVerification";

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
      licenseType,
      licenseImage,
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
      select: { profileVerified: true, licenseImage: true },
    });

    const nextLicenseImage = licenseImage ?? existingUser?.licenseImage ?? "";
    if (nextLicenseImage && !hasSubmittedLicense(nextLicenseImage)) {
      return NextResponse.json(
        { error: "Upload the licence image using Redrive's secure uploader" },
        { status: 400 }
      );
    }

    const licenseChanged = nextLicenseImage !== (existingUser?.licenseImage ?? "");
    const profileVerified = hasSubmittedLicense(nextLicenseImage)
      ? licenseChanged ? "PENDING" : existingUser?.profileVerified === "Y" ? "Y" : "PENDING"
      : "N";

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
        profileVerified,
        licenseImage: nextLicenseImage,
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
