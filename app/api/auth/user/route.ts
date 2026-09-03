import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { internalError } from "@/app/libs/apiError";

async function GETHandler() {
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
      licenseStatus: currentUser.licenseStatus,
      licenseExpiresAt: currentUser.licenseExpiresAt?.toISOString() || null,
      licenseExpiryDate: currentUser.licenseExpiryDate,
      licenseIssuerState: currentUser.licenseIssuerState,
      licenseHolderName: currentUser.licenseHolderName,
      licenseNumberLast4: currentUser.licenseNumberLast4,
      licenseCardLast4: currentUser.licenseCardLast4,
      licenseNameMatches: currentUser.licenseNameMatches,
      licenseDobMatches: currentUser.licenseDobMatches,
      licenseClassificationConfidence: currentUser.licenseClassificationConfidence,
      licenseVerifiedAt: currentUser.licenseVerifiedAt?.toISOString() || null,
      licenseRejectionReason: currentUser.licenseRejectionReason,
      profileVerified: currentUser.profileVerified,
      loginOtpEnabled: currentUser.loginOtpEnabled,
      hasPassword: Boolean(currentUser.hashedPassword),
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
    });
  } catch (error) {
    return internalError(error, { event: "current_user_fetch_failed", route: "GET /api/auth/user" });
  }
}

export const GET = monitorApiRoute("/api/auth/user", GETHandler, "GET");
