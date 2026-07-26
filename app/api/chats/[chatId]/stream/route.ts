import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createSSEStream, sseResponse, type SSEEvent } from "@/app/libs/sse";
import { toSafeMessage } from "@/app/libs/chatSerializers";

export const dynamic = "force-dynamic";

// GET (SSE): live updates for one open conversation — new messages, the
// other participant's typing indicator, and read-receipt flips on the
// viewer's own messages. The client (EventSource) reconnects automatically
// every time this stream closes itself; the browser resends the id of the
// last "message" event as `Last-Event-ID`, so reconnects resume exactly
// where they left off with no manual bookkeeping on the client.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || !chat.participantIds.includes(currentUser.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const otherUserId = chat.participantIds.find((id) => id !== currentUser.id) ?? null;

  const resumeFrom = request.headers.get("last-event-id") || request.nextUrl.searchParams.get("since");
  let since = resumeFrom ? new Date(resumeFrom) : new Date();

  // Snapshot of the viewer's own messages the other participant hasn't
  // read yet, so a read-receipt flip is caught even for messages sent
  // before this stream connection opened.
  const initiallyUnread = await prisma.message.findMany({
    where: {
      chatId,
      senderId: currentUser.id,
      ...(otherUserId ? { NOT: { readByIds: { has: otherUserId } } } : {}),
    },
    select: { id: true },
  });
  const pendingReadIds = new Set(initiallyUnread.map((m) => m.id));

  const stream = createSSEStream({
    intervalMs: 1000,
    poll: async (): Promise<SSEEvent[]> => {
      const events: SSEEvent[] = [];

      const newMessages = await prisma.message.findMany({
        where: { chatId, createdAt: { gt: since } },
        orderBy: { createdAt: "asc" },
      });

      for (const message of newMessages) {
        events.push({
          event: "message",
          id: message.createdAt.toISOString(),
          data: toSafeMessage(message),
        });
        if (
          message.senderId === currentUser.id &&
          otherUserId &&
          !message.readByIds.includes(otherUserId)
        ) {
          pendingReadIds.add(message.id);
        }
      }
      if (newMessages.length > 0) {
        since = newMessages[newMessages.length - 1].createdAt;
      }

      if (pendingReadIds.size > 0 && otherUserId) {
        const nowRead = await prisma.message.findMany({
          where: { id: { in: Array.from(pendingReadIds) }, readByIds: { has: otherUserId } },
          select: { id: true },
        });
        if (nowRead.length > 0) {
          events.push({ event: "read", data: { messageIds: nowRead.map((m) => m.id) } });
          nowRead.forEach((m) => pendingReadIds.delete(m.id));
        }
      }

      if (otherUserId) {
        const freshChat = await prisma.chat.findUnique({
          where: { id: chatId },
          select: { typingUserId: true, typingAt: true },
        });
        if (
          freshChat?.typingUserId === otherUserId &&
          freshChat.typingAt &&
          Date.now() - freshChat.typingAt.getTime() < 4000
        ) {
          events.push({ event: "typing", data: { userId: otherUserId, isTyping: true } });
        }
      }

      return events;
    },
  });

  return sseResponse(stream);
}
