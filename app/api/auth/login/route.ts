import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/app/libs/prismadb";
import jwt from "jsonwebtoken";

// POST: Login endpoint for API testing compatibility
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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
      { expiresIn: "24h" }
    );

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

// GET: Check login endpoint availability
export async function GET() {
  return NextResponse.json({
    message: "Login endpoint is available",
    endpoints: {
      login: "POST /api/auth/login",
      session: "GET /api/auth/session",
      user: "GET /api/auth/user",
    },
  });
}
