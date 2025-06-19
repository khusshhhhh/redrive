import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import type { NextRequest } from "next/server";

// ✅ GET: Fetch all messages for a chat
export async function GET(
  request: NextRequest,
  { params }: { params: Record<string, string> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.chatId;

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
    console.error("Error fetching messages", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ POST: Send a new message in a chat
export async function POST(
  request: NextRequest,
  { params }: { params: Record<string, string> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.chatId;
    const { text, imageUrl } = await request.json();

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
    console.error("Error sending message", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
