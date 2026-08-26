import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { touchWebSession } from "@/app/libs/webSessions";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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

  if (!(await touchWebSession(session.webSessionId, userId))) {
    console.warn("Web session activity rejected", { reason: "SESSION_ROW_INVALID" });
    return NextResponse.json({ error: "Your session has expired. Sign in again.", code: "SESSION_INVALID" }, { status: 401 });
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export const POST = monitorApiRoute("/api/auth/activity", POSTHandler, "POST");
