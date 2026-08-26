import crypto from "crypto";
import type { DeviceMetadata } from "@redrive/contracts/mobile";

import prisma from "@/app/libs/prismadb";
import { mobileAuthConfig } from "@/app/libs/mobile-auth/config";
import { issueMobileAccessToken } from "@/app/libs/mobile-auth/tokens";
import { getMobileUser } from "@/app/libs/mobile-auth/users";
import { writeAuditEvent } from "@/app/libs/security";

export class MobileSessionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "MobileSessionError";
  }
}

function refreshTokenHash(token: string) {
  return crypto.createHmac("sha256", mobileAuthConfig().refreshTokenPepper).update(token).digest("hex");
}

function newRefreshToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function sessionPayload(userId: string, sessionId: string, refreshToken: string, refreshTokenExpiresAt: Date) {
  const user = await getMobileUser(userId);
  if (!user) throw new MobileSessionError("USER_NOT_FOUND", "The account no longer exists.");
  const access = issueMobileAccessToken(userId, sessionId);
  return {
    ...access,
    accessTokenExpiresAt: access.accessTokenExpiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    sessionId,
    user,
  };
}

export async function createMobileSession(input: {
  userId: string;
  device: DeviceMetadata;
  request?: Request;
}) {
  const rawToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + mobileAuthConfig().refreshTokenTtlMs);
  const session = await prisma.mobileSession.create({
    data: {
      userId: input.userId,
      tokenFamilyId: crypto.randomUUID(),
      refreshTokenHash: refreshTokenHash(rawToken),
      deviceId: input.device.deviceId,
      deviceName: input.device.deviceName || null,
      platform: input.device.platform,
      appVersion: input.device.appVersion || null,
      expiresAt,
    },
  });
  await writeAuditEvent({ request: input.request, actorUserId: input.userId, action: "MOBILE_LOGIN_SUCCEEDED", targetType: "MobileSession", targetId: session.id });
  return sessionPayload(input.userId, session.id, rawToken, expiresAt);
}

export async function rotateMobileSession(rawToken: string, request?: Request) {
  const hash = refreshTokenHash(rawToken);
  const current = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: hash } });
  if (!current) throw new MobileSessionError("INVALID_REFRESH_TOKEN", "Your session is no longer valid.");

  if (current.rotatedAt || current.revokeReason === "REFRESH_TOKEN_REUSE") {
    await revokeMobileTokenFamily(current.tokenFamilyId, "REFRESH_TOKEN_REUSE");
    await writeAuditEvent({ request, actorUserId: current.userId, action: "MOBILE_REFRESH_TOKEN_REUSED", targetType: "MobileSession", targetId: current.id });
    throw new MobileSessionError("REFRESH_TOKEN_REUSED", "This session was revoked for your security. Sign in again.");
  }
  if (current.revokedAt) throw new MobileSessionError("SESSION_REVOKED", "Your session was revoked. Sign in again.");
  if (Date.now() - current.lastSeenAt.getTime() >= mobileAuthConfig().sessionIdleTimeoutMs) {
    await revokeMobileTokenFamily(current.tokenFamilyId, "IDLE_TIMEOUT");
    await writeAuditEvent({ request, actorUserId: current.userId, action: "MOBILE_SESSION_IDLE_TIMEOUT", targetType: "MobileSession", targetId: current.id });
    throw new MobileSessionError("SESSION_IDLE_TIMEOUT", "You were signed out after being inactive. Sign in again.");
  }
  if (current.expiresAt.getTime() <= Date.now()) {
    await revokeMobileTokenFamily(current.tokenFamilyId, "EXPIRED");
    throw new MobileSessionError("REFRESH_TOKEN_EXPIRED", "Your session has expired. Sign in again.");
  }

  const nextToken = newRefreshToken();
  const now = new Date();
  const next = await prisma.$transaction(async (tx) => {
    const claimed = await tx.mobileSession.updateMany({
      where: { id: current.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: now, lastSeenAt: now },
    });
    if (claimed.count !== 1) throw new MobileSessionError("REFRESH_TOKEN_REUSED", "This session was already refreshed.");
    return tx.mobileSession.create({
      data: {
        userId: current.userId,
        tokenFamilyId: current.tokenFamilyId,
        refreshTokenHash: refreshTokenHash(nextToken),
        deviceId: current.deviceId,
        deviceName: current.deviceName,
        platform: current.platform,
        appVersion: current.appVersion,
        expiresAt: current.expiresAt,
        lastSeenAt: now,
      },
    });
  }).catch(async (error) => {
    if (error instanceof MobileSessionError && error.code === "REFRESH_TOKEN_REUSED") {
      await revokeMobileTokenFamily(current.tokenFamilyId, "REFRESH_TOKEN_REUSE");
      await writeAuditEvent({ request, actorUserId: current.userId, action: "MOBILE_REFRESH_TOKEN_REUSED", targetType: "MobileSession", targetId: current.id });
    }
    throw error;
  });

  return sessionPayload(current.userId, next.id, nextToken, current.expiresAt);
}

export async function revokeMobileTokenFamily(tokenFamilyId: string, reason: string) {
  return prisma.mobileSession.updateMany({
    where: { tokenFamilyId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}

export async function revokeMobileSessionByRefreshToken(rawToken: string, reason: string) {
  const session = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: refreshTokenHash(rawToken) } });
  if (!session) return null;
  await revokeMobileTokenFamily(session.tokenFamilyId, reason);
  return session;
}

export async function revokeAllMobileSessions(userId: string, reason: string) {
  return prisma.mobileSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}
