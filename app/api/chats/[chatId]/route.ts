import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// ✅ GET: Fetch messages for a chat
export async function GET(
  req: NextRequest,
  { params }: { params?: Record<string, string> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params?.chatId;
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID missing" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true },
        },
      },
    });

    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const safeChat = {
      ...chat,
      createdAt: chat.createdAt.toISOString(),
      messages: chat.messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        sender: {
          ...m.sender,
          createdAt: m.sender.createdAt.toISOString(),
          updatedAt: m.sender.updatedAt.toISOString(),
          emailVerified: m.sender.emailVerified
            ? m.sender.emailVerified.toISOString()
            : null,
        },
      })),
    };

    return NextResponse.json(safeChat);
  } catch (error) {
    console.error("GET /api/chats/[chatId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ POST: Send a message to a chat
export async function POST(
  req: NextRequest,
  { params }: { params?: Record<string, string> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params?.chatId;
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID missing" }, { status: 400 });
    }

    const { text, imageUrl } = await req.json();

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: currentUser.id,
        text,
        imageUrl,
      },
      include: { sender: true },
    });

    const safeMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      sender: {
        ...message.sender,
        createdAt: message.sender.createdAt.toISOString(),
        updatedAt: message.sender.updatedAt.toISOString(),
        emailVerified: message.sender.emailVerified
          ? message.sender.emailVerified.toISOString()
          : null,
      },
    };

    return NextResponse.json(safeMessage, { status: 201 });
  } catch (error) {
    console.error("POST /api/chats/[chatId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
