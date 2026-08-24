import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import { optionalIdentity } from "@/app/libs/mobile-auth/identity";

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
  request?: Request | NextRequest
): Promise<AuthUser | null> {
  try {
    const identity = request ? await optionalIdentity(request) : await optionalIdentity(new Request("http://localhost"));
    if (!identity) return null;
    const user = await prisma.user.findUnique({ where: { id: identity.userId } });
    if (!user?.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name || "",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerified: user.emailVerified?.toISOString() || null,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Backwards compatible wrapper for existing getCurrentUser usage
 */
export { getCurrentUserEnhanced as getCurrentUser };
