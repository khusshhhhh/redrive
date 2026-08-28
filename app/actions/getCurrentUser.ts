import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { cache } from "react";

const getCurrentUser = cache(async () => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return null;
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!currentUser) {
      return null;
    }

    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      number: currentUser.number,
      dateOfBirth: currentUser.dateOfBirth,
      image: currentUser.image,
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
      lastActiveAt: currentUser.lastActiveAt?.toISOString() || null,
      favoriteIds: currentUser.favoriteIds,
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
    };
  } catch (error) {
    // `getServerSession` reads request headers. When Next probes whether a route
    // can be statically rendered it throws a control-flow error to signal
    // "this route is dynamic" — that must propagate, not be swallowed as null,
    // or the route silently loses its dynamic marking.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw error;
    }
    console.error("Error fetching current user:", error);
    return null;
  }
});

export default getCurrentUser;
