import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/app/libs/prismadb";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { consumeRateLimits, getClientIp, tooManyRequests, writeAuditEvent } from "@/app/libs/security";

// POST: Login endpoint for API testing compatibility
async function POSTHandler(request: NextRequest) {
  try {
    if (process.env.ENABLE_LEGACY_API_AUTH !== "true") {
      return NextResponse.json({ error: "Use the standard Redrive sign-in flow" }, { status: 404 });
    }
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const { password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate user credentials manually (same logic as NextAuth)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const rateLimit = await consumeRateLimits([
      { scope: "legacy-login-ip", identifier: getClientIp(request), limit: 10, windowMs: 15 * 60_000 },
      { scope: "legacy-login-account", identifier: email, limit: 5, windowMs: 15 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

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
    console.error("❌ Login API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function GETHandler() {
  return NextResponse.json({ enabled: process.env.ENABLE_LEGACY_API_AUTH === "true" });
}

export const POST = monitorApiRoute("/api/auth/login", POSTHandler, "POST");

export const GET = monitorApiRoute("/api/auth/login", GETHandler, "GET");
