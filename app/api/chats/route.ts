import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// GET all chats for current user
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const chats = await prisma.chat.findMany({
      where: { participantIds: { has: currentUser.id } },
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

        return {
          ...chat,
          createdAt: chat.createdAt.toISOString(),
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
    console.error("Error fetching chats", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST to create or get chat between current user and another user
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    let chat = await prisma.chat.findFirst({
      where: { participantIds: { hasEvery: [currentUser.id, userId] } },
    });

    if (!chat) {
      chat = await prisma.chat.create({ data: { participantIds: [currentUser.id, userId] } });
    }

    return NextResponse.json({ id: chat.id });
  } catch (error) {
    console.error("Error creating chat", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
