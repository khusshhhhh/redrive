import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { headers } from "next/headers";

export default async function getCurrentUser() {
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
      ...currentUser,
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
      lastActiveAt: currentUser.lastActiveAt?.toISOString() || null,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
