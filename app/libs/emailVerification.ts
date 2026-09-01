import crypto from "crypto";
import nodemailer from "nodemailer-v9";

const CODE_TTL_MINUTES = 10;
const EMAIL_PATTERN = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

function assertSafeRecipient(email: string) {
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error("Invalid email address");
  }
}

export function getEmailTransport() {
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

function safeName(recipientName?: string | null) {
  const trimmed = recipientName?.trim();
  if (!trimmed) return null;
  // Keep only the first name so the greeting stays warm and short.
  const first = trimmed.split(/\s+/)[0].slice(0, 40);
  return escapeHtml(first);
}

/* --------------------------------------------------------------------------
 * Shared visual shell
 *
 * One light theme for every Redrive email: a plain white ground (no gradients
 * anywhere), a single rounded card, a warm yellow hairline as the only accent,
 * and a type scale that collapses cleanly from desktop down to small phones.
 * Both the one-time-code emails and the welcome email are built from this.
 * ------------------------------------------------------------------------ */

const THEME = {
  ground: "#F4F4F4",
  card: "#FFFFFF",
  border: "#E7E7E7",
  hairline: "#EDEDED",
  ink: "#111111",
  body: "#4A4A4A",
  muted: "#6E6E6E",
  faint: "#9A9A9A",
  accent: "#EAB308",
  panel: "#FFFFFF",
} as const;

const EMAIL_HEAD_STYLE = `
  @media only screen and (max-width:620px) {
    .shell { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .pad-top { padding-top:26px !important; }
    .title { font-size:27px !important; line-height:33px !important; }
    .code { font-size:33px !important; letter-spacing:8px !important; }
    .illus { padding-left:12px !important; padding-right:12px !important; }
    .stack { display:block !important; width:100% !important; }
    .stack-gap { height:14px !important; }
    .hide-sm { display:none !important; }
  }
  @media (prefers-color-scheme: dark) {
    .shell, .pad { background:#FFFFFF !important; }
    .ground { background:#F4F4F4 !important; }
  }
`;

function emailDocument({
  title,
  preheader,
  bodyRows,
}: {
  title: string;
  preheader: string;
  bodyRows: string;
}) {
  const helpUrl = getPublicAppUrl() ? `${getPublicAppUrl()}/help-centre` : null;
  const privacyUrl = getPublicAppUrl() ? `${getPublicAppUrl()}/privacy` : null;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
    <style>${EMAIL_HEAD_STYLE}</style>
  </head>
  <body style="margin:0;padding:0;background:${THEME.ground};color:${THEME.body};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ground" style="background:${THEME.ground};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:20px;overflow:hidden;">
            <tr>
              <td class="pad" style="padding:26px 40px 22px;border-bottom:1px solid ${THEME.hairline};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;border-radius:12px;background:${THEME.ink};color:#ffffff;font-size:22px;font-weight:700;line-height:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">R</td>
                          <td style="padding-left:11px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${THEME.ink};">redrive<span style="color:${THEME.accent};">.</span></td>
                        </tr>
                      </table>
                    </td>
                    ${helpUrl ? `<td class="hide-sm" align="right" style="vertical-align:middle;"><a href="${helpUrl}" style="font-size:13px;font-weight:600;color:${THEME.muted};text-decoration:none;">Help centre</a></td>` : ""}
                  </tr>
                </table>
              </td>
            </tr>
            ${bodyRows}
            <tr>
              <td class="pad" style="padding:24px 40px 30px;border-top:1px solid ${THEME.hairline};background:${THEME.card};">
                <p style="margin:0;font-size:12px;line-height:19px;color:${THEME.faint};">
                  You are receiving this email because an action was taken with your Redrive account.
                  ${privacyUrl ? `Read our <a href="${privacyUrl}" style="color:${THEME.muted};text-decoration:underline;">privacy notice</a>.` : ""}
                </p>
                <p style="margin:10px 0 0;font-size:12px;line-height:19px;color:${THEME.faint};">
                  Redrive &middot; Peer-to-peer vehicle hire across Australia
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;line-height:17px;color:${THEME.faint};">This is an automated message&mdash;please do not reply.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function illustrationRow(path: string, alt: string, maxWidth = 360) {
  const appUrl = getPublicAppUrl();
  if (!appUrl) return "";
  return `<tr><td class="illus" align="center" style="padding:30px 40px 6px;">
    <img src="${appUrl}${path}" width="${maxWidth}" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:${maxWidth}px;height:auto;border:0;outline:none;text-decoration:none;">
  </td></tr>`;
}

function headlineRow({
  eyebrow,
  title,
  intro,
  greeting,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  greeting?: string | null;
}) {
  return `<tr>
    <td class="pad pad-top" style="padding:22px 40px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="22" style="padding-top:7px;"><div style="width:22px;height:3px;background:${THEME.accent};border-radius:2px;"></div></td>
          <td style="padding-left:10px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${THEME.muted};">${escapeHtml(eyebrow)}</td>
        </tr>
      </table>
      <h1 class="title" style="margin:14px 0 0;font-size:32px;line-height:39px;letter-spacing:-0.8px;font-weight:800;color:${THEME.ink};">${title}</h1>
      ${greeting ? `<p style="margin:18px 0 0;font-size:16px;line-height:26px;font-weight:700;color:${THEME.ink};">${greeting}</p>` : ""}
      <p style="margin:${greeting ? "6px" : "16px"} 0 0;font-size:16px;line-height:26px;color:${THEME.body};">${intro}</p>
    </td>
  </tr>`;
}

function ctaRow(label: string, url: string) {
  return `<tr><td class="pad" align="center" style="padding:26px 40px 6px;">
    <a href="${url}" style="display:inline-block;min-width:180px;padding:15px 28px;border-radius:999px;background:${THEME.accent};color:${THEME.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr>`;
}

/* ---------------------------- one-time-code email ------------------------- */

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
  const name = safeName(recipientName);
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const rows = `
    ${illustrationRow("/illustrations/mail-sent.png", "An envelope on its way to you", 300)}
    ${headlineRow({ eyebrow, title, intro: introduction, greeting })}
    <tr>
      <td class="pad" style="padding:22px 40px 6px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${THEME.border};border-top:3px solid ${THEME.accent};border-radius:14px;">
          <tr><td align="center" style="padding:18px 12px 2px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:${THEME.muted};">Your verification code</td></tr>
          <tr><td class="code" align="center" style="padding:4px 8px 16px;font-size:40px;line-height:50px;font-weight:800;letter-spacing:10px;color:${THEME.ink};font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${code}</td></tr>
        </table>
        <p style="margin:14px 0 0;text-align:center;font-size:13px;line-height:20px;color:${THEME.muted};">Enter this code in Redrive. It expires in <strong style="color:${THEME.ink};">${CODE_TTL_MINUTES} minutes</strong>.</p>
      </td>
    </tr>
    ${appUrl ? ctaRow("Open Redrive", appUrl) : ""}
    <tr>
      <td class="pad" style="padding:24px 40px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${THEME.hairline};">
          <tr>
            <td style="padding-top:20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;border-radius:50%;border:1px solid ${THEME.border};color:${THEME.ink};font-size:16px;line-height:34px;">&#128274;</td>
                  <td style="padding-left:12px;font-size:13px;line-height:20px;color:${THEME.muted};">${escapeHtml(securityMessage)}<br><strong style="color:${THEME.ink};">Never share this code with anyone.</strong></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailDocument({
    title,
    preheader: `${code} is your Redrive code. It expires in ${CODE_TTL_MINUTES} minutes.`,
    bodyRows: rows,
  });
}

/* ------------------------------- welcome email --------------------------- */

function welcomeStep(number: number, heading: string, copy: string) {
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid ${THEME.hairline};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="34" valign="top" style="width:34px;">
            <div style="width:30px;height:30px;border-radius:50%;border:1px solid ${THEME.ink};color:${THEME.ink};font-size:14px;font-weight:700;line-height:30px;text-align:center;">${number}</div>
          </td>
          <td style="padding-left:14px;">
            <p style="margin:0;font-size:15px;line-height:22px;font-weight:700;color:${THEME.ink};">${escapeHtml(heading)}</p>
            <p style="margin:3px 0 0;font-size:14px;line-height:21px;color:${THEME.muted};">${copy}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildWelcomeEmail(recipientName?: string | null) {
  const appUrl = getPublicAppUrl();
  const name = safeName(recipientName);
  const link = (path: string) => (appUrl ? `${appUrl}${path}` : "#");

  const rows = `
    ${illustrationRow("/illustrations/road-trip.png", "A camper van heading out on an open road", 400)}
    ${headlineRow({
      eyebrow: "Welcome to Redrive",
      title: name ? `You&rsquo;re all set, ${name}.` : "You&rsquo;re all set.",
      greeting: null,
      intro:
        "Your email is confirmed and your account is live. Redrive is where people across Australia rent out useful vehicles &mdash; utes for the weekend job, campervans for the long way home &mdash; and where you can earn from the one sitting in your driveway.",
    })}
    <tr>
      <td class="pad" style="padding:24px 40px 4px;">
        <p style="margin:0 0 4px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${THEME.muted};">Three ways to start</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${welcomeStep(1, "Explore vehicles near you", `Filter by dates, location and vehicle type to see what locals are sharing. <a href="${link("/explore")}" style="color:${THEME.ink};font-weight:600;text-decoration:underline;">Browse the marketplace &rarr;</a>`)}
          ${welcomeStep(2, "Build a shortlist", `Tap the heart on any listing to save it. Your favourites stay with your account across every device. <a href="${link("/favorites")}" style="color:${THEME.ink};font-weight:600;text-decoration:underline;">Open favourites &rarr;</a>`)}
          ${welcomeStep(3, "List your own vehicle", `Free to list, no membership fees, and you set the price and the rules. <a href="${link("/host")}" style="color:${THEME.ink};font-weight:600;text-decoration:underline;">Become a host &rarr;</a>`)}
        </table>
      </td>
    </tr>
    ${appUrl ? ctaRow("Explore vehicles", link("/explore")) : ""}
    <tr>
      <td class="pad" style="padding:24px 40px 6px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${THEME.border};border-radius:14px;">
          <tr>
            <td style="padding:18px 20px;">
              <span style="display:inline-block;padding:5px 11px;border-radius:999px;background:${THEME.ink};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Smart tip</span>
              <p style="margin:12px 0 0;font-size:14px;line-height:22px;color:${THEME.body};">
                Add your dream trips and the kind of vehicles you like in your profile. Redrive uses them to surface better matches on the explore page &mdash; the more it knows, the sharper the recommendations.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="pad" style="padding:22px 40px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${THEME.hairline};">
          <tr>
            <td style="padding-top:20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="42" valign="top" style="width:42px;">
                    <div style="width:40px;height:40px;border-radius:50%;background:${THEME.ink};color:#ffffff;font-size:15px;font-weight:700;line-height:40px;text-align:center;">R</div>
                  </td>
                  <td style="padding-left:13px;">
                    <p style="margin:0;font-size:14px;line-height:22px;color:${THEME.body};">&ldquo;We built Redrive so the right vehicle is never more than a neighbour away. Thanks for joining &mdash; we&rsquo;re glad you&rsquo;re here.&rdquo;</p>
                    <p style="margin:8px 0 0;font-size:13px;line-height:20px;font-weight:700;color:${THEME.ink};">The Redrive team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return emailDocument({
    title: "Welcome to Redrive",
    preheader: "Your account is live. Here are three ways to get started.",
    bodyRows: rows,
  });
}

function welcomeText(recipientName?: string | null) {
  const appUrl = getPublicAppUrl();
  const name = recipientName?.trim().split(/\s+/)[0]?.slice(0, 40);
  const base = appUrl || "https://redrive.com.au";
  return [
    name ? `You're all set, ${name}.` : "You're all set.",
    "",
    "Your email is confirmed and your Redrive account is live.",
    "",
    "Three ways to start:",
    `1. Explore vehicles near you - ${base}/explore`,
    `2. Build a shortlist of favourites - ${base}/favorites`,
    `3. List your own vehicle - ${base}/host`,
    "",
    "Tip: add your dream trips and preferred vehicle types in your profile for sharper recommendations.",
    "",
    "The Redrive team",
  ].join("\n");
}

/* -------------------------------- senders ------------------------------- */

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
      eyebrow: "One quick step",
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
      title: "Confirm it&rsquo;s you",
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

  const rows = `
    ${illustrationRow("/illustrations/signed-out.png", "A padlock", 260)}
    ${headlineRow({
      eyebrow: "Account security",
      title: "Reset your password",
      greeting: "Hi there,",
      intro: "This secure link expires in 30 minutes and can only be used once.",
    })}
    ${ctaRow("Choose a new password", resetUrl)}
    <tr><td class="pad" style="padding:22px 40px 10px;">
      <p style="margin:0;font-size:13px;line-height:20px;color:${THEME.muted};">If you did not request this, ignore this email &mdash; your password has not changed.</p>
    </td></tr>`;

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: "Reset your Redrive password",
    text: `Use this secure link within 30 minutes to reset your Redrive password: ${resetUrl}. If you did not request this, ignore this email.`,
    html: emailDocument({
      title: "Reset your Redrive password",
      preheader: "A secure link to choose a new password. It expires in 30 minutes.",
      bodyRows: rows,
    }),
  });
  return { delivered: true };
}

/**
 * Sent once, right after a new account's email address is verified. Best-effort:
 * callers should not fail the verification flow if this throws.
 */
export async function sendWelcomeEmail(email: string, recipientName?: string | null) {
  assertSafeRecipient(email);
  const transport = getEmailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] Welcome email skipped (no transport) for ${email}`);
      return { delivered: false };
    }
    throw new Error("Email delivery is not configured");
  }

  await transport.transporter.sendMail({
    from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
    to: email,
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: "Welcome to Redrive — you're all set",
    text: welcomeText(recipientName),
    html: buildWelcomeEmail(recipientName),
  });

  return { delivered: true };
}
