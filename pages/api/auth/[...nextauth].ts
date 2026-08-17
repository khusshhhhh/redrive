import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { consumeRateLimits, writeAuditEvent } from "@/app/libs/security";

import prisma from "@/app/libs/prismadb";
import {
  createVerificationCode,
  hashVerificationCode,
  isVerificationCodeValid,
  sendLoginOtpEmail,
  verificationExpiry,
} from "@/app/libs/emailVerification";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
        otp: { label: "otp", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();
        const forwardedFor = request.headers?.["x-forwarded-for"];
        const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]?.trim() || "unknown";
        const rateLimit = await consumeRateLimits([
          { scope: "signin-ip", identifier: ip, limit: 15, windowMs: 15 * 60_000 },
          { scope: "signin-account", identifier: email, limit: 7, windowMs: 15 * 60_000 },
        ]);
        if (!rateLimit.allowed) throw new Error("Too many sign-in attempts. Please wait and try again.");

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }
        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          await writeAuditEvent({ action: "LOGIN_FAILED", targetType: "User", targetId: user.id, actorUserId: user.id, reason: "INVALID_PASSWORD" });
          throw new Error("Invalid credentials");
        }

        if (user.verificationRequired && !user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        if (user.loginOtpEnabled) {
          const otp = credentials.otp?.replace(/\D/g, "");

          if (!otp) {
            let previewCode = "";
            const recentlySent = user.loginOtpCodeSentAt &&
              Date.now() - user.loginOtpCodeSentAt.getTime() < 60_000 &&
              user.loginOtpCodeHash &&
              user.loginOtpCodeExpires &&
              user.loginOtpCodeExpires.getTime() > Date.now();

            if (!recentlySent) {
              const code = createVerificationCode();
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  loginOtpCodeHash: hashVerificationCode(code),
                  loginOtpCodeExpires: verificationExpiry(),
                  loginOtpCodeSentAt: new Date(),
                  loginOtpAttempts: 0,
                },
              });
              const delivery = await sendLoginOtpEmail(user.email!, code, user.name);
              previewCode = delivery.previewCode || "";
            }
            throw new Error(previewCode ? `LOGIN_OTP_REQUIRED:${previewCode}` : "LOGIN_OTP_REQUIRED");
          }

          if (!user.loginOtpCodeHash || !user.loginOtpCodeExpires || user.loginOtpCodeExpires.getTime() < Date.now()) {
            throw new Error("LOGIN_OTP_EXPIRED");
          }

          if (!isVerificationCodeValid(otp, user.loginOtpCodeHash)) {
            const locked = user.loginOtpAttempts >= 4;
            await prisma.user.update({
              where: { id: user.id },
              data: locked
                ? { loginOtpCodeHash: null, loginOtpCodeExpires: null, loginOtpAttempts: 0 }
                : { loginOtpAttempts: { increment: 1 } },
            });
            throw new Error(locked ? "LOGIN_OTP_LOCKED" : "LOGIN_OTP_INVALID");
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginOtpCodeHash: null,
              loginOtpCodeExpires: null,
              loginOtpCodeSentAt: null,
              loginOtpAttempts: 0,
            },
          });
        }

        await writeAuditEvent({ action: "LOGIN_SUCCEEDED", targetType: "User", targetId: user.id, actorUserId: user.id });

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  debug: false,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
