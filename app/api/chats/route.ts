import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// ✅ GET all chats for the current user
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        participantIds: {
          has: currentUser.id,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeChats = await Promise.all(
      chats.map(async (chat) => {
        const otherId = chat.participantIds.find((id) => id !== currentUser.id);
        const otherUser = otherId
          ? await prisma.user.findUnique({ where: { id: otherId } })
          : null;

        const unreadCount = chat.messages.filter(
          (m) =>
            m.senderId !== currentUser.id &&
            !m.readByIds.includes(currentUser.id)
        ).length;

        return {
          ...chat,
          createdAt: chat.createdAt.toISOString(),
          unreadCount,
          otherUser: otherUser
            ? {
                ...otherUser,
                createdAt: otherUser.createdAt.toISOString(),
                updatedAt: otherUser.updatedAt.toISOString(),
                emailVerified: otherUser.emailVerified
                  ? otherUser.emailVerified.toISOString()
                  : null,
              }
            : null,
          messages: chat.messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
            readByIds: m.readByIds,
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
      })
    );

    return NextResponse.json(safeChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ POST to create or return existing chat with a user
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Find existing chat with both users
    let chat = await prisma.chat.findFirst({
      where: {
        participantIds: {
          hasEvery: [currentUser.id, userId],
        },
      },
    });

    // Create new chat if none exists
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
