export interface SmsResult {
  delivered: boolean;
  skippedReason?: string;
}

/** E.164-ish sanity check; strips spaces and normalises a leading 0 for AU. */
export function normaliseAuMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^0\d{9}$/.test(cleaned)) return `+61${cleaned.slice(1)}`;
  if (/^61\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

/**
 * Time-critical SMS only (payment about to expire, return overdue, same-day
 * pickup, security). Inert until an SMS provider is configured, so nothing
 * breaks before Twilio / MessageMedia credentials exist.
 *
 * Twilio:  SMS_PROVIDER=twilio  SMS_TWILIO_ACCOUNT_SID  SMS_TWILIO_AUTH_TOKEN  SMS_FROM
 */
export async function sendSms(
  to: string | null | undefined,
  body: string,
): Promise<SmsResult> {
  const number = normaliseAuMobile(to);
  if (!number) return { delivered: false, skippedReason: "invalid-number" };

  const provider = process.env.SMS_PROVIDER;
  if (!provider) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Redrive] SMS (no provider) → ${number}: ${body.slice(0, 80)}`);
    }
    return { delivered: false, skippedReason: "no-provider" };
  }

  try {
    if (provider === "twilio") {
      const sid = process.env.SMS_TWILIO_ACCOUNT_SID;
      const token = process.env.SMS_TWILIO_AUTH_TOKEN;
      const from = process.env.SMS_FROM;
      if (!sid || !token || !from) {
        return { delivered: false, skippedReason: "provider-misconfigured" };
      }
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: number, From: from, Body: body.slice(0, 480) }),
        },
      );
      if (!response.ok) {
        console.error("Twilio SMS HTTP error", response.status);
        return { delivered: false, skippedReason: `http-${response.status}` };
      }
      return { delivered: true };
    }

    return { delivered: false, skippedReason: "unknown-provider" };
  } catch (error) {
    console.error("SMS send failed", error);
    return { delivered: false, skippedReason: "send-error" };
  }
}
