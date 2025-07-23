import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import jwt from "jsonwebtoken";
import prisma from "@/app/libs/prismadb";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
}

/**
 * Enhanced authentication middleware that supports both:
 * 1. NextAuth.js sessions (for web app)
 * 2. JWT tokens (for API testing)
 */
export async function getCurrentUserEnhanced(
  request?: NextRequest
): Promise<AuthUser | null> {
  try {
    // Method 1: Try NextAuth session first (standard app flow)
    if (!request) {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name || "",
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            emailVerified: user.emailVerified?.toISOString() || null,
          };
        }
      }
    }

    // Method 2: Try JWT token from Authorization header (for API testing)
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        try {
          const decoded = jwt.verify(
            token,
            process.env.NEXTAUTH_SECRET || "fallback-secret"
          ) as { userId: string; email: string; name: string };

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
          });

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name || "",
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString(),
              emailVerified: user.emailVerified?.toISOString() || null,
            };
          }
        } catch (jwtError) {
          console.log("JWT verification failed:", jwtError);
          // Continue to session check if JWT fails
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Backwards compatible wrapper for existing getCurrentUser usage
 */
export { getCurrentUserEnhanced as getCurrentUser };
