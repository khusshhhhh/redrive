import bcrypt from "bcryptjs";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import {
  createVerificationCode,
  hashVerificationCode,
  sendVerificationEmail,
  verificationExpiry,
} from "@/app/libs/emailVerification";

export async function POST(request: Request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch (error) {
      console.error("❌ Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }


    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Request body is missing" },
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const { password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const code = createVerificationCode();
    const verificationData = {
      name,
      hashedPassword,
      verificationCodeHash: hashVerificationCode(code),
      verificationCodeExpires: verificationExpiry(),
      verificationCodeSentAt: new Date(),
      verificationAttempts: 0,
      verificationRequired: true,
    };

    const user = existingUser
      ? await prisma.user.update({ where: { email }, data: verificationData })
      : await prisma.user.create({ data: { email, ...verificationData } });

    const delivery = await sendVerificationEmail(email, code);

    return NextResponse.json(
      {
        email: user.email,
        requiresVerification: true,
        ...(delivery.previewCode ? { previewCode: delivery.previewCode } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error registering user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create account" },
      { status: 500 }
    );
  }
}
