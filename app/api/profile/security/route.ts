import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { notificationService } from "@/app/services/notificationService";
import { writeAuditEvent } from "@/app/libs/security";

const passwordIsStrong = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

async function PATCHHandler(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loginOtpEnabled } = await request.json();
  if (typeof loginOtpEnabled !== "boolean") {
    return NextResponse.json({ error: "Invalid security setting" }, { status: 400 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Add an email before enabling login verification" }, { status: 400 });
  }
  if (loginOtpEnabled && process.env.NODE_ENV === "production" &&
      (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    return NextResponse.json(
      { error: "Login verification is unavailable until email delivery is configured" },
      { status: 503 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginOtpEnabled,
      loginOtpCodeHash: null,
      loginOtpCodeExpires: null,
      loginOtpCodeSentAt: null,
      loginOtpAttempts: 0,
    },
  });

  await Promise.all([
    notificationService.notifySecurityAlert(
      user.id,
      loginOtpEnabled ? "Login verification enabled" : "Login verification disabled",
      loginOtpEnabled ? "A one-time email code is now required after your password." : "Your account no longer requires an email code after your password.",
      "/profile#security",
    ),
    writeAuditEvent({ request, actorUserId: user.id, action: loginOtpEnabled ? "LOGIN_OTP_ENABLED" : "LOGIN_OTP_DISABLED", targetType: "User", targetId: user.id }),
  ]).catch((error) => console.error("Security setting notification failed", error));

  return NextResponse.json({ loginOtpEnabled });
}

async function PUTHandler(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.hashedPassword) {
    return NextResponse.json({ error: "This account uses Google sign-in and does not have a password" }, { status: 400 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 });
  }
  if (!(await bcrypt.compare(currentPassword, user.hashedPassword))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  if (!passwordIsStrong(newPassword)) {
    return NextResponse.json({ error: "New password does not meet the security requirements" }, { status: 400 });
  }
  if (await bcrypt.compare(newPassword, user.hashedPassword)) {
    return NextResponse.json({ error: "Choose a password you have not just used" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() },
  });

  await Promise.all([
    notificationService.notifySecurityAlert(user.id, "Password changed", "Your Redrive password was changed. If this was not you, reset it immediately.", "/profile#security"),
    writeAuditEvent({ request, actorUserId: user.id, action: "PASSWORD_CHANGED", targetType: "User", targetId: user.id }),
  ]).catch((error) => console.error("Password-change notification failed", error));

  return NextResponse.json({ changed: true });
}

export const PATCH = monitorApiRoute("/api/profile/security", PATCHHandler, "PATCH");

export const PUT = monitorApiRoute("/api/profile/security", PUTHandler, "PUT");
