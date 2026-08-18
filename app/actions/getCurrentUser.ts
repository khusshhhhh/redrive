import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { cache } from "react";

const getCurrentUser = cache(async () => {
  try {
    // Fetch session with correct request context
    const session = await getServerSession(authOptions);

    // If no session or email, return null
    if (!session?.user?.email) {
      return null;
    }

    // Fetch user from database using email
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
      profileVerified: currentUser.profileVerified,
      loginOtpEnabled: currentUser.loginOtpEnabled,
      hasPassword: Boolean(currentUser.hashedPassword),
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
});

export default getCurrentUser;
