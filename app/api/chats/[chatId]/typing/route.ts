import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// POST { isTyping: boolean } — sets/clears the ephemeral typing indicator
// for the current user in this chat. Client throttles calls to roughly
// once per 2s while actively typing, plus an immediate "stopped" signal on
// blur/send/idle-timeout.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const { isTyping } = await request.json();

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.chat.update({
      where: { id: chatId },
      data: isTyping
        ? { typingUserId: currentUser.id, typingAt: new Date() }
        : { typingUserId: null, typingAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chats/[chatId]/typing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
