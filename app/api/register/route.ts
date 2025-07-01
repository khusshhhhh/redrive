import bcrypt from "bcryptjs";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/app/libs/email";

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

    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.verificationToken.create({
      data: {
        email,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (e) {
      console.error("❌ Failed to send OTP email:", e);
    }

    return NextResponse.json(
      { message: "OTP sent to email", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error registering user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
