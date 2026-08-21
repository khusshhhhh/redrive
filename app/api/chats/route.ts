import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { buildChatSummary } from "@/app/libs/chatSerializers";

// GET: inbox summary for the current user — one row per chat, last message
// preview + unread count only (not the full message history, which is
// fetched paginated per-chat via /api/chats/[chatId]/messages).
async function GETHandler() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: { participantIds: { has: currentUser.id } },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const summaries = await Promise.all(
      chats.map((chat) => buildChatSummary(chat, currentUser.id))
    );

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: create or return the existing 1:1 chat with a given user.
async function POSTHandler(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    let chat = await prisma.chat.findFirst({
      where: {
        participantIds: {
          hasEvery: [currentUser.id, userId],
        },
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          participantIds: [currentUser.id, userId],
        },
      });
    }

    return NextResponse.json({ id: chat.id });
  } catch (error) {
    console.error("Error creating or fetching chat:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = monitorApiRoute("/api/chats", GETHandler, "GET");

export const POST = monitorApiRoute("/api/chats", POSTHandler, "POST");
