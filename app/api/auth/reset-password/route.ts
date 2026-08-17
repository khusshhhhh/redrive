import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { consumeRateLimits, getClientIp, securityHash, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

const strongPassword = (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || !strongPassword(password)) return NextResponse.json({ error: "Use a strong password with uppercase, lowercase, number and symbol" }, { status: 400 });

  const rateLimit = await consumeRateLimits([{ scope: "password-reset-use-ip", identifier: getClientIp(request), limit: 10, windowMs: 60 * 60_000 }]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: securityHash(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { hashedPassword: await bcrypt.hash(password, 12), passwordChangedAt: new Date(), loginOtpCodeHash: null, loginOtpCodeExpires: null } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.userSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await writeAuditEvent({ request, actorUserId: record.userId, action: "PASSWORD_RESET_COMPLETED", targetType: "User", targetId: record.userId });
  return NextResponse.json({ changed: true });
}

