import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { cache } from "react";
import type { SessionUser } from "@/app/types";

/**
 * Minimal session projection for `/api/me` — just what the browser chrome
 * needs. Unlike `getCurrentUser`, this never pulls the licence fields, home
 * address, phone number, or security flags across the wire.
 */
const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        state: true,
        favoriteIds: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      state: user.state,
      favoriteIds: user.favoriteIds,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw error;
    }
    console.error("Error fetching session user:", error);
    return null;
  }
});

export default getSessionUser;
