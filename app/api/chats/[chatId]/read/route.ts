import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { publishRealtime } from "@/app/libs/realtime/publish";
import { chatChannel, userChannel, RealtimeEvent } from "@/app/libs/realtime/events";

// POST: mark every message from the other participant as read by the
// current user. Deliberately a separate action (not a GET side effect) so
// the client controls exactly when "read" fires — only while the
// conversation is actually open/focused.
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nowRead = await prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: currentUser.id },
        NOT: { readByIds: { has: currentUser.id } },
      },
      select: { id: true },
    });

    await prisma.message.updateMany({
      where: { id: { in: nowRead.map((message) => message.id) } },
      data: { readByIds: { push: currentUser.id } },
    });

    if (nowRead.length > 0) {
      // Tell the other participant their messages have been seen. `readerId`
      // lets each client ignore its own echo on the shared conversation channel.
      const payload = {
        readerId: currentUser.id,
        messageIds: nowRead.map((message) => message.id),
      };
      const otherUserId = chat.participantIds.find((id) => id !== currentUser.id);
      await Promise.all([
        publishRealtime(chatChannel(chatId), RealtimeEvent.Read, payload),
        otherUserId
          ? publishRealtime(userChannel(otherUserId), RealtimeEvent.Read, payload)
          : Promise.resolve(),
      ]).catch((error) => console.error("Realtime read receipt failed", error));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chats/[chatId]/read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = monitorApiRoute("/api/chats/[chatId]/read", POSTHandler, "POST");
