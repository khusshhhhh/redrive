import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { touchWebSession } from "@/app/libs/webSessions";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

async function POSTHandler() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || !session.webSessionId) {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }

  if (!(await touchWebSession(session.webSessionId, userId))) {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export const POST = monitorApiRoute("/api/auth/activity", POSTHandler, "POST");
