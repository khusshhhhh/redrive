import crypto from "crypto";

import prisma from "@/app/libs/prismadb";
import { sessionIdleTimeoutMs, sessionIsIdle, WEB_SESSION_ABSOLUTE_MAX_AGE_MS } from "@/app/libs/sessionPolicy";

export type WebSessionInvalidReason = "IDLE_TIMEOUT" | "ABSOLUTE_TIMEOUT" | "REVOKED" | "SESSION_NOT_FOUND";

export async function createWebSession(userId: string, now = new Date()) {
  return prisma.userSession.create({
    data: {
      userId,
      tokenHash: crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"),
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + WEB_SESSION_ABSOLUTE_MAX_AGE_MS),
    },
  });
}

// A session id reaches these helpers from a signed cookie, but a cookie issued
// before a database was replaced can still carry an id that Mongo cannot parse,
// and that must read as a finished session rather than a server error.
function isSessionId(value: string) {
  return /^[0-9a-f]{24}$/i.test(value);
}

export async function validateWebSession(sessionId: string, userId: string, now = new Date()): Promise<WebSessionInvalidReason | null> {
  if (!isSessionId(sessionId)) return "SESSION_NOT_FOUND";
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return "SESSION_NOT_FOUND";
  if (session.revokedAt) return "REVOKED";
  if (session.expiresAt.getTime() <= now.getTime()) return "ABSOLUTE_TIMEOUT";
  if (sessionIsIdle(session.lastSeenAt, now.getTime())) return "IDLE_TIMEOUT";
  return null;
}

export async function touchWebSession(sessionId: string, userId: string, now = new Date()): Promise<WebSessionInvalidReason | null> {
  if (!isSessionId(sessionId)) return "SESSION_NOT_FOUND";
  const idleCutoff = new Date(now.getTime() - sessionIdleTimeoutMs());
  const result = await prisma.userSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
      lastSeenAt: { gt: idleCutoff },
    },
    data: { lastSeenAt: now },
  });
  if (result.count === 1) return null;

  // A write that changes nothing is not counted as modified, so two activity
  // pings landing on the same millisecond leave a perfectly valid session
  // looking untouched. Read the row back to tell that apart from a session that
  // has really ended, and report why rather than a bare failure.
  return validateWebSession(sessionId, userId, now);
}

export async function revokeWebSession(sessionId: string) {
  await prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
