import "server-only";
import Pusher from "pusher";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/app/libs/prismadb";
import { userChannel, chatChannel } from "@/app/libs/realtime/events";

// Pusher private-channel auth. The browser never holds the app secret: it sends
// its socket id + the channel it wants, we check the session, and only sign the
// subscription if this user is actually allowed on that channel —
//   private-user-<id>   → must be their own id
//   private-chat-<id>   → must be a participant of that conversation
//
// Clients only ever subscribe; all publishing is server-side, so a signed
// subscription can't be used to inject messages or read a stranger's chat.

function pusherClient(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;
  return new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
}

async function POSTHandler(request: NextRequest) {
  const pusher = pusherClient();
  if (!pusher) {
    return NextResponse.json({ error: "Realtime is not configured" }, { status: 501 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const socketId = String(form.get("socket_id") || "");
  const channelName = String(form.get("channel_name") || "");
  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  let allowed = false;
  if (channelName === userChannel(currentUser.id)) {
    allowed = true;
  } else if (channelName.startsWith("private-chat-")) {
    const chatId = channelName.slice("private-chat-".length);
    if (/^[a-f\d]{24}$/i.test(chatId)) {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { participantIds: true },
      });
      allowed = Boolean(chat?.participantIds.includes(currentUser.id))
        && channelName === chatChannel(chatId);
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth, { headers: { "Cache-Control": "no-store" } });
}

export const POST = monitorApiRoute("/api/realtime/auth", POSTHandler, "POST");
