import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedOtp,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    console.log(`OTP for ${email}: ${otp}`);
    return NextResponse.json({ message: "OTP sent" });
  } catch (error) {
    console.error("Error sending OTP", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
