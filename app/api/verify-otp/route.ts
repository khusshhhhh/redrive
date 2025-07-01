import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const token = await prisma.verificationToken.findFirst({
      where: { email, token: otp },
    });

    if (!token || token.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { id: token.id } });

    return NextResponse.json({ message: 'Email verified' }, { status: 200 });
  } catch (error) {
    console.error('❌ OTP verification failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
