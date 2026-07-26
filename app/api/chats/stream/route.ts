import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createSSEStream, sseResponse, type SSEEvent } from "@/app/libs/sse";
import { buildChatSummary } from "@/app/libs/chatSerializers";

export const dynamic = "force-dynamic";

// GET (SSE): live inbox updates — any chat the current user is part of
// whose updatedAt advanced (new message) is pushed down as a `chat-update`
// event so the inbox list can move it to the top and refresh its unread
// badge without a manual refresh. Reconnects resume via `Last-Event-ID`
// (see the per-chat stream route for the same pattern).
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resumeFrom = request.headers.get("last-event-id") || request.nextUrl.searchParams.get("since");
  let since = resumeFrom ? new Date(resumeFrom) : new Date();

  const stream = createSSEStream({
    intervalMs: 1500,
    poll: async (): Promise<SSEEvent[]> => {
      const events: SSEEvent[] = [];

      const changedChats = await prisma.chat.findMany({
        where: {
          participantIds: { has: currentUser.id },
          updatedAt: { gt: since },
        },
        orderBy: { updatedAt: "asc" },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      for (const chat of changedChats) {
        const summary = await buildChatSummary(chat, currentUser.id);
        events.push({
          event: "chat-update",
          id: chat.updatedAt.toISOString(),
          data: summary,
        });
      }

      if (changedChats.length > 0) {
        since = changedChats[changedChats.length - 1].updatedAt;
      }

      return events;
    },
  });

  return sseResponse(stream);
}
