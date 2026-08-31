import prisma from "@/app/libs/prismadb";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  /** Deep-link path or structured payload the app routes on. */
  data?: Record<string, string | number | null | undefined>;
}

export interface PushResult {
  delivered: boolean;
  sent: number;
  skippedReason?: string;
}

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

/**
 * Fan a notification out to every active device a user has registered. Expo's
 * push service needs no server key for modest volume. Best-effort: unreachable
 * service or an empty token list resolves quietly, and tokens Expo reports as
 * dead are marked so the next send skips them.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<PushResult> {
  if (process.env.PUSH_DISABLED === "true") {
    return { delivered: false, sent: 0, skippedReason: "disabled" };
  }

  const tokens = await prisma.mobilePushToken.findMany({
    where: { userId, disabledAt: null, invalidAt: null },
    select: { id: true, token: true },
  });
  const expoTokens = tokens.filter((row) => isExpoToken(row.token));
  if (expoTokens.length === 0) {
    return { delivered: false, sent: 0, skippedReason: "no-tokens" };
  }

  const payload = expoTokens.map((row) => ({
    to: row.token,
    title: message.title,
    body: message.body,
    sound: "default" as const,
    priority: "high" as const,
    data: message.data ?? {},
  }));

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Expo push HTTP error", response.status);
      return { delivered: false, sent: 0, skippedReason: `http-${response.status}` };
    }
    const json = (await response.json().catch(() => null)) as
      | { data?: Array<{ status: string; details?: { error?: string } }> }
      | null;

    const results = json?.data ?? [];
    const deadTokenIds: string[] = [];
    results.forEach((result, index) => {
      if (
        result?.status === "error" &&
        result.details?.error === "DeviceNotRegistered" &&
        expoTokens[index]
      ) {
        deadTokenIds.push(expoTokens[index].id);
      }
    });
    if (deadTokenIds.length) {
      await prisma.mobilePushToken.updateMany({
        where: { id: { in: deadTokenIds } },
        data: { invalidAt: new Date() },
      });
    }

    const sent = expoTokens.length - deadTokenIds.length;
    return { delivered: sent > 0, sent };
  } catch (error) {
    console.error("Expo push send failed", error);
    return { delivered: false, sent: 0, skippedReason: "send-error" };
  }
}
