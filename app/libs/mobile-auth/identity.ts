import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";
import { verifyMobileAccessToken } from "@/app/libs/mobile-auth/tokens";

export type RequestIdentity = {
  userId: string;
  method: "web-session" | "mobile-access-token";
  sessionId?: string;
  tokenFamilyId?: string;
};

export class IdentityRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "IdentityRequiredError";
  }
}

export async function optionalIdentity(request: Request): Promise<RequestIdentity | null> {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    if (!authorization.startsWith("Bearer ")) return null;
    try {
      const identity = await verifyMobileAccessToken(authorization.slice(7).trim());
      return { ...identity, method: "mobile-access-token" };
    } catch {
      return null;
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return user ? { userId: user.id, method: "web-session" } : null;
}

async function requireIdentity(request: Request) {
  const identity = await optionalIdentity(request);
  if (!identity) throw new IdentityRequiredError();
  return identity;
}

export async function requireMobileIdentity(request: Request) {
  const identity = await requireIdentity(request);
  if (identity.method !== "mobile-access-token" || !identity.sessionId || !identity.tokenFamilyId) {
    throw new IdentityRequiredError();
  }
  return identity;
}
