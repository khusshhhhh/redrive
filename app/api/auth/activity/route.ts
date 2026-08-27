import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { touchWebSession, type WebSessionInvalidReason } from "@/app/libs/webSessions";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const EXPIRY_MESSAGES: Record<WebSessionInvalidReason, string> = {
  IDLE_TIMEOUT: "You were signed out after a period of inactivity. Sign in again.",
  ABSOLUTE_TIMEOUT: "Your session has reached its maximum length. Sign in again.",
  REVOKED: "This session was signed out somewhere else. Sign in again.",
  SESSION_NOT_FOUND: "Your session has expired. Sign in again.",
};

async function POSTHandler() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    console.warn("Web session activity rejected", { reason: session?.sessionInvalidReason || "AUTHENTICATION_REQUIRED" });
    return NextResponse.json({ error: "Your session has expired. Sign in again.", code: "SESSION_INVALID" }, { status: 401 });
  }
  if (!session.webSessionId) {
    console.warn("Web session activity rejected", { reason: "SESSION_ID_NOT_READY" });
    return NextResponse.json({ error: "Your session is still starting. Try again.", code: "SESSION_ID_NOT_READY" }, { status: 409 });
  }

  const invalidReason = await touchWebSession(session.webSessionId, userId);
  if (invalidReason) {
    console.warn("Web session activity rejected", { reason: invalidReason });
    return NextResponse.json(
      { error: EXPIRY_MESSAGES[invalidReason], code: "SESSION_INVALID", reason: invalidReason },
      { status: 401 },
    );
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export const POST = monitorApiRoute("/api/auth/activity", POSTHandler, "POST");
