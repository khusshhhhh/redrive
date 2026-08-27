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

function getPublicAppUrl() {
  try {
    const configuredUrl = process.env.NEXTAUTH_URL;
    if (!configuredUrl) return null;
    const url = new URL(configuredUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function buildCodeEmail({
  code,
  eyebrow,
  title,
  introduction,
  securityMessage,
  recipientName,
}: {
  code: string;
  eyebrow: string;
  title: string;
  introduction: string;
  securityMessage: string;
  recipientName?: string | null;
}) {
  const appUrl = getPublicAppUrl();
  const heroUrl = appUrl ? `${appUrl}/images/email-verification-road-trip.jpg` : null;
  const helpUrl = appUrl ? `${appUrl}/help-centre` : null;
  const greeting = recipientName?.trim()
    ? `Hi ${escapeHtml(recipientName.trim().slice(0, 80))},`
    : "Hi there,";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${title}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .content-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .hero-pad { padding-left: 16px !important; padding-right: 16px !important; }
        .email-title { font-size: 30px !important; line-height: 36px !important; }
        .code { font-size: 34px !important; letter-spacing: 8px !important; }
        .hide-mobile { display: none !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#edeae4;color:#161616;font-family:Arial,'Helvetica Neue',sans-serif;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${code} is your Redrive code. It expires in ${CODE_TTL_MINUTES} minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edeae4;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #dfdcd5;border-radius:22px;overflow:hidden;box-shadow:0 10px 30px rgba(22, 22, 22,.08);">
            <tr>
              <td class="content-pad" style="padding:24px 36px;background:#ffffff;border-bottom:1px solid #ebe8e2;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:13px;background:#710014;color:#ffffff;font-size:24px;font-weight:700;line-height:42px;">R</td>
                          <td style="padding-left:12px;font-size:25px;font-weight:700;letter-spacing:-1px;color:#161616;">redrive<span style="color:#b38f6f;">.</span></td>
                        </tr>
                      </table>
                    </td>
                    ${helpUrl ? `<td class="hide-mobile" align="right"><a href="${helpUrl}" style="font-size:13px;font-weight:700;color:#6b645e;text-decoration:none;">Help centre</a></td>` : ""}
                  </tr>
                </table>
              </td>
            </tr>
            ${heroUrl ? `<tr><td class="hero-pad" style="padding:24px 24px 0;"><img src="${heroUrl}" width="552" alt="A Redrive journey along the South Australian coast" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:16px;"></td></tr>` : ""}
            <tr>
              <td class="content-pad" style="padding:34px 44px 12px;">
                <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#710014;">${eyebrow}</div>
                <h1 class="email-title" style="margin:10px 0 0;font-size:38px;line-height:44px;letter-spacing:-1.4px;color:#161616;">${title}</h1>
                <p style="margin:20px 0 0;font-size:16px;line-height:26px;font-weight:700;color:#161616;">${greeting}</p>
                <p style="margin:8px 0 0;font-size:16px;line-height:26px;color:#6b645e;">${introduction}</p>
              </td>
            </tr>
            <tr>
              <td class="content-pad" style="padding:20px 44px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f1ed;border:1px solid #dfdcd5;border-top:4px solid #b38f6f;border-radius:14px;">
                  <tr><td align="center" style="padding:18px 12px 4px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#6b645e;">Your verification code</td></tr>
                  <tr><td class="code" align="center" style="padding:4px 8px 18px;font-size:42px;line-height:52px;font-weight:800;letter-spacing:11px;color:#710014;font-family:'Courier New',monospace;">${code}</td></tr>
                </table>
                <p style="margin:14px 0 0;text-align:center;font-size:13px;line-height:20px;color:#6b645e;">Enter this code in Redrive. It expires in <strong style="color:#161616;">${CODE_TTL_MINUTES} minutes</strong>.</p>
              </td>
            </tr>
            ${appUrl ? `<tr><td align="center" class="content-pad" style="padding:22px 44px 8px;"><a href="${appUrl}" style="display:inline-block;min-width:178px;padding:14px 24px;border-radius:999px;background:#710014;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;">Open Redrive</a></td></tr>` : ""}
            <tr>
              <td class="content-pad" style="padding:26px 44px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #ebe8e2;">
                  <tr>
                    <td style="padding-top:22px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;border-radius:50%;background:#f2f1ed;color:#710014;font-size:17px;line-height:34px;">&#128737;</td>
                          <td style="padding-left:12px;font-size:13px;line-height:20px;color:#6b645e;">${securityMessage}<br><strong style="color:#161616;">Never share this code with anyone.</strong></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px;background:#161616;color:#c6c0b6;font-size:12px;line-height:19px;">
                Sent securely by Redrive<br><span style="color:#8f877f;">Explore Australia with confidence.</span>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:11px;line-height:18px;color:#8f877f;">This is an automated security email. Please do not reply.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(email: string, code: string, recipientName?: string | null) {
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
    html: buildCodeEmail({
      code,
      eyebrow: "One quick step before the road",
      title: "Verify your email",
      introduction: "Use the code below to finish creating your Redrive account and get ready to explore.",
      securityMessage: "If you did not create a Redrive account, you can safely ignore this email.",
      recipientName,
    }),
  });

  return { delivered: true };
}

export async function sendLoginOtpEmail(email: string, code: string, recipientName?: string | null) {
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
    html: buildCodeEmail({
      code,
      eyebrow: "Secure sign-in",
      title: "Confirm it’s you",
      introduction: "Enter this one-time code to complete your sign-in and continue to your Redrive account.",
      securityMessage: "If you did not try to sign in, change your password and review your account security.",
      recipientName,
    }),
  });

  return { delivered: true };
}

export async function sendAccountDeletionOtpEmail(email: string, code: string, recipientName?: string | null) {
  assertSafeRecipient(email);
  const transport = getEmailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Account deletion code for ${email}: ${code}`);
      return { delivered: false, previewCode: code };
    }
    throw new Error("Email delivery is not configured");
  }

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: `${code} confirms your Redrive account deletion`,
    text: `Your Redrive account deletion code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Deleting your account is permanent. If you did not request this, do not share the code and secure your account.`,
    html: buildCodeEmail({
      code,
      eyebrow: "Permanent account action",
      title: "Confirm account deletion",
      introduction: "Use this code only if you intend to permanently delete your Redrive account and app-controlled personal information.",
      securityMessage: "If you did not request account deletion, do not enter this code. Change your password and review your account security.",
      recipientName,
    }),
  });

  return { delivered: true };
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  assertSafeRecipient(email);
  const transport = getEmailTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Password reset link for ${email}: ${resetUrl}`);
      return { delivered: false, previewUrl: resetUrl };
    }
    throw new Error("Email delivery is not configured");
  }

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: "Reset your Redrive password",
    text: `Use this secure link within 30 minutes to reset your Redrive password: ${resetUrl}. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#161616"><div style="font-size:22px;font-weight:700;margin-bottom:28px;color:#710014">Redrive</div><h1 style="font-size:24px;margin:0 0 12px">Reset your password</h1><p style="color:#6B645E;line-height:1.6">This secure link expires in 30 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;background:#710014;color:white;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700">Choose a new password</a></p><p style="font-size:13px;color:#8F877F">If you did not request this, ignore this email. Your password has not changed.</p></div>`,
  });
  return { delivered: true };
}
