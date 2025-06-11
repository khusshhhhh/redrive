import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const valid = await bcrypt.compare(otp, user.resetToken);
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified" });
  } catch (error) {
    console.error("Error verifying OTP", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
