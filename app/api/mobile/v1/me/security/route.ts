import bcrypt from "bcryptjs";
import { z } from "zod";
import { objectIdSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { revokeAllMobileSessions, revokeMobileTokenFamily } from "@/app/libs/mobile-auth/sessions";
import { mobileError, mobileJson, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, writeAuditEvent } from "@/app/libs/security";
import { notificationService } from "@/app/services/notificationService";

const strongPassword = z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[^A-Za-z0-9]/);

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { loginOtpEnabled: true, passwordChangedAt: true } }),
    prisma.mobileSession.findMany({ where: { userId: auth.identity.userId, rotatedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, take: 50, select: { id: true, tokenFamilyId: true, deviceId: true, deviceName: true, platform: true, appVersion: true, lastSeenAt: true, expiresAt: true, createdAt: true } }),
  ]);
  return mobileJson(request, { loginOtpEnabled: user?.loginOtpEnabled || false, passwordChangedAt: user?.passwordChangedAt?.toISOString() || null, sessions: sessions.map((session) => ({ id: session.id, current: session.tokenFamilyId === auth.identity.tokenFamilyId, deviceId: session.deviceId, deviceName: session.deviceName, platform: session.platform, appVersion: session.appVersion, lastSeenAt: session.lastSeenAt.toISOString(), expiresAt: session.expiresAt.toISOString(), createdAt: session.createdAt.toISOString() })) });
}

async function PATCHHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ loginOtpEnabled: z.boolean(), currentPassword: z.string().min(1).max(128) }));
  if (!parsed.ok) return parsed.response;
  const rateLimit = await consumeRateLimits([{ scope: "mobile-security-setting-user", identifier: auth.identity.userId, limit: 8, windowMs: 60 * 60_000 }, { scope: "mobile-security-setting-ip", identifier: getClientIp(request), limit: 20, windowMs: 60 * 60_000 }]);
  if (!rateLimit.allowed) return mobileError(request, 429, "RATE_LIMITED", "Too many security changes. Wait and try again.", undefined, { "Retry-After": String(rateLimit.retryAfterSeconds) });
  const user = await prisma.user.findUnique({ where: { id: auth.identity.userId } });
  if (!user?.hashedPassword || !await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword)) return mobileError(request, 400, "REAUTHENTICATION_FAILED", "Your current password is incorrect.");
  if (parsed.data.loginOtpEnabled && process.env.NODE_ENV === "production" && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) return mobileError(request, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Login verification is unavailable until email delivery is configured.");
  await prisma.user.update({ where: { id: user.id }, data: { loginOtpEnabled: parsed.data.loginOtpEnabled, loginOtpCodeHash: null, loginOtpCodeExpires: null, loginOtpCodeSentAt: null, loginOtpAttempts: 0 } });
  await writeAuditEvent({ request, actorUserId: user.id, action: parsed.data.loginOtpEnabled ? "LOGIN_OTP_ENABLED" : "LOGIN_OTP_DISABLED", targetType: "User", targetId: user.id });
  return mobileJson(request, { loginOtpEnabled: parsed.data.loginOtpEnabled });
}

async function PUTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ currentPassword: z.string().min(1).max(128), newPassword: strongPassword }));
  if (!parsed.ok) return parsed.response;
  const user = await prisma.user.findUnique({ where: { id: auth.identity.userId } });
  if (!user?.hashedPassword) return mobileError(request, 400, "PASSWORD_UNAVAILABLE", "This account does not have a password.");
  if (!await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword)) return mobileError(request, 400, "REAUTHENTICATION_FAILED", "Your current password is incorrect.");
  if (await bcrypt.compare(parsed.data.newPassword, user.hashedPassword)) return mobileError(request, 400, "PASSWORD_REUSED", "Choose a different password.");
  await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: await bcrypt.hash(parsed.data.newPassword, 12), passwordChangedAt: new Date() } });
  await Promise.all([prisma.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }), revokeAllMobileSessions(user.id, "PASSWORD_CHANGED")]);
  await notificationService.notifySecurityAlert(user.id, "Password changed", "Your Redrive password was changed. If this was not you, reset it immediately.", "/profile#security").catch(() => undefined);
  await writeAuditEvent({ request, actorUserId: user.id, action: "PASSWORD_CHANGED", targetType: "User", targetId: user.id });
  return mobileJson(request, { changed: true, signedOut: true });
}

async function DELETEHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ sessionId: objectIdSchema }));
  if (!parsed.ok) return parsed.response;
  const session = await prisma.mobileSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session || session.userId !== auth.identity.userId) return mobileError(request, 404, "SESSION_NOT_FOUND", "That device session was not found.");
  const result = await revokeMobileTokenFamily(session.tokenFamilyId, "USER_REVOKED_DEVICE");
  await writeAuditEvent({ request, actorUserId: auth.identity.userId, action: "MOBILE_SESSION_REVOKED", targetType: "MobileSession", targetId: session.id });
  return mobileJson(request, { revoked: result.count, current: session.tokenFamilyId === auth.identity.tokenFamilyId });
}

export const GET = monitorApiRoute("/api/mobile/v1/me/security", GETHandler, "GET");
export const PATCH = monitorApiRoute("/api/mobile/v1/me/security", PATCHHandler, "PATCH");
export const PUT = monitorApiRoute("/api/mobile/v1/me/security", PUTHandler, "PUT");
export const DELETE = monitorApiRoute("/api/mobile/v1/me/security", DELETEHandler, "DELETE");
