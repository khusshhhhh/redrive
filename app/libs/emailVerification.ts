import crypto from "crypto";
import nodemailer from "nodemailer";

const CODE_TTL_MINUTES = 10;

export function createVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function isVerificationCodeValid(code: string, storedHash: string) {
  const supplied = Buffer.from(hashVerificationCode(code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
}

export function verificationExpiry() {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
}

export async function sendVerificationEmail(email: string, code: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Verification code for ${email}: ${code}`);
      return { delivered: false, previewCode: code };
    }
    throw new Error("Email delivery is not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${user}>`,
    to: email,
    subject: `${code} is your Redrive verification code`,
    text: `Your Redrive verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you did not create an account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#222">
        <div style="font-size:22px;font-weight:700;margin-bottom:28px">Redrive</div>
        <h1 style="font-size:24px;margin:0 0 12px">Verify your email</h1>
        <p style="color:#666;line-height:1.6">Enter this code to finish creating your account. It expires in ${CODE_TTL_MINUTES} minutes.</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#f7f7f7;border-radius:12px;padding:20px;text-align:center;margin:24px 0">${code}</div>
        <p style="font-size:13px;color:#888">If you did not create a Redrive account, you can safely ignore this email.</p>
      </div>`,
  });

  return { delivered: true };
}
