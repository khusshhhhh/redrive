import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";
import { checkCredentials } from "@/app/libs/credentialCheck";

// POST: Login endpoint for API testing compatibility
async function POSTHandler(request: NextRequest) {
  try {
    if (process.env.ENABLE_LEGACY_API_AUTH !== "true") {
      return NextResponse.json({ error: "Use the standard Redrive sign-in flow" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Rate-limit BEFORE touching credentials, so credential-stuffing is
    // throttled whether or not it guesses a real account.
    const rateLimit = await consumeRateLimits([
      { scope: "legacy-login-ip", identifier: getClientIp(request), limit: 10, windowMs: 15 * 60_000 },
      { scope: "legacy-login-account", identifier: email, limit: 5, windowMs: 15 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const check = await checkCredentials(email, password);

    if (!check.ok) {
      await writeAuditEvent({
        request,
        actorUserId: check.user?.id,
        action: "LEGACY_API_LOGIN_FAILED",
        targetType: "User",
        targetId: check.user?.id,
        reason: "INVALID_CREDENTIALS",
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const user = check.user;

    if (user.verificationRequired && !user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before logging in" },
        { status: 403 }
      );
    }

    if (user.loginOtpEnabled) {
      return NextResponse.json(
        { error: "Email login verification is enabled. Use the Redrive sign-in window to continue." },
        { status: 403 }
      );
    }

    if (!process.env.NEXTAUTH_SECRET) {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXTAUTH_SECRET is not set" },
        { status: 500 }
      );
    }

    // Generate JWT token for testing purposes
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: "15m", issuer: "redrive", audience: "redrive-api", jwtid: crypto.randomUUID() }
    );

    await writeAuditEvent({ request, actorUserId: user.id, action: "LEGACY_API_LOGIN", targetType: "User", targetId: user.id });

    // Return user data with token (compatible with test expectations)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
      },
      accessToken: token,
      token: token, // Alternative token field for different test expectations
    });
  } catch (error) {
    console.error("Legacy login API error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function GETHandler() {
  return NextResponse.json({ enabled: process.env.ENABLE_LEGACY_API_AUTH === "true" });
}

export const POST = monitorApiRoute("/api/auth/login", POSTHandler, "POST");

export const GET = monitorApiRoute("/api/auth/login", GETHandler, "GET");
