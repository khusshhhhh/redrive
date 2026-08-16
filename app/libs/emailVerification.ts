import crypto from "crypto";
import nodemailer from "nodemailer-v9";

const CODE_TTL_MINUTES = 10;
const EMAIL_PATTERN = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

function assertSafeRecipient(email: string) {
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error("Invalid email address");
  }
}

function getEmailTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;
  if (/[\r\n]/.test(host) || /[\r\n]/.test(user)) {
    throw new Error("Invalid SMTP configuration");
  }

  return {
    user,
    transporter: nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  };
}

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
  assertSafeRecipient(email);
  const transport = getEmailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Verification code for ${email}: ${code}`);
      return { delivered: false, previewCode: code };
    }
    throw new Error("Email delivery is not configured");
  }

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: `${code} is your Redrive verification code`,
    text: `Your Redrive verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you did not create an account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#2B211D">
        <div style="font-size:22px;font-weight:700;margin-bottom:28px;color:#D65A31">Redrive</div>
        <h1 style="font-size:24px;margin:0 0 12px">Verify your email</h1>
        <p style="color:#705C52;line-height:1.6">Enter this code to finish creating your account. It expires in ${CODE_TTL_MINUTES} minutes.</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#FFF6F1;border:1px solid #F0DDD3;border-radius:12px;padding:20px;text-align:center;margin:24px 0">${code}</div>
        <p style="font-size:13px;color:#967E72">If you did not create a Redrive account, you can safely ignore this email.</p>
      </div>`,
  });

  return { delivered: true };
}

export async function sendLoginOtpEmail(email: string, code: string) {
  assertSafeRecipient(email);
  const transport = getEmailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Login code for ${email}: ${code}`);
      return { delivered: false, previewCode: code };
    }
    throw new Error("Email delivery is not configured");
  }

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: `${code} is your Redrive login code`,
    text: `Your Redrive login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If this was not you, change your password.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#2B211D">
        <div style="font-size:22px;font-weight:700;margin-bottom:28px;color:#D65A31">Redrive</div>
        <h1 style="font-size:24px;margin:0 0 12px">Confirm it’s you</h1>
        <p style="color:#705C52;line-height:1.6">Enter this code to complete your login. It expires in ${CODE_TTL_MINUTES} minutes.</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#FFF6F1;border:1px solid #F0DDD3;border-radius:12px;padding:20px;text-align:center;margin:24px 0">${code}</div>
        <p style="font-size:13px;color:#967E72">If you did not try to log in, change your password and review your account.</p>
      </div>`,
  });

  return { delivered: true };
}
