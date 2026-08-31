import { getEmailTransport } from "@/app/libs/emailVerification";
import { siteUrl } from "@/app/libs/siteUrl";

import {
  plainTextFallback,
  renderEmail,
  type RenderEmailInput,
} from "./emailLayout";

const EMAIL_PATTERN = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

function safeRecipient(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export interface SendResult {
  delivered: boolean;
  skippedReason?: string;
}

export interface TransactionalEmail {
  to: string | null | undefined;
  subject: string;
  /** When set, adds List-Unsubscribe headers and a footer link (non-transactional mail). */
  unsubscribeUrl?: string | null;
  content: Omit<RenderEmailInput, "appUrl" | "unsubscribeUrl">;
}

/**
 * Best-effort transactional / lifecycle email. Never throws: when SMTP is not
 * configured it logs and returns `{ delivered: false }` so callers (crons,
 * webhooks, API routes) can carry on. Deliverability, templating and a provider
 * swap all happen behind this one function.
 */
export async function sendTransactionalEmail(
  message: TransactionalEmail,
): Promise<SendResult> {
  const to = safeRecipient(message.to);
  if (!to) return { delivered: false, skippedReason: "invalid-recipient" };

  const appUrl = siteUrl || null;
  const input: RenderEmailInput = {
    ...message.content,
    appUrl,
    unsubscribeUrl: message.unsubscribeUrl ?? null,
  };

  const html = renderEmail(input);
  const text = plainTextFallback(input);

  const transport = getEmailTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] email (no SMTP) → ${to}: ${message.subject}`);
      return { delivered: false, skippedReason: "no-transport" };
    }
    return { delivered: false, skippedReason: "no-transport" };
  }

  const headers: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    await transport.transporter.sendMail({
      from: process.env.EMAIL_FROM || `Redrive <${transport.user}>`,
      to,
      subject: message.subject,
      text,
      html,
      headers,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return { delivered: true };
  } catch (error) {
    console.error("Transactional email send failed", message.subject, error);
    return { delivered: false, skippedReason: "send-error" };
  }
}
