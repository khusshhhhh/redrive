import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// POST: mark every message from the other participant as read by the
// current user. Deliberately a separate action (not a GET side effect) so
// the client controls exactly when "read" fires — only while the
// conversation is actually open/focused.
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
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: currentUser.id },
        NOT: { readByIds: { has: currentUser.id } },
      },
      data: { readByIds: { push: currentUser.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chats/[chatId]/read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
