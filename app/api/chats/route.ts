import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { buildChatSummary } from "@/app/libs/chatSerializers";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

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

    return NextResponse.json(summaries, { headers: { "Cache-Control": "private, no-store" } });
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

    const rateLimit = await consumeRateLimits([
      { scope: "chat-create-user", identifier: currentUser.id, limit: 20, windowMs: 60 * 60_000 },
      { scope: "chat-create-ip", identifier: getClientIp(request), limit: 40, windowMs: 60 * 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4_096) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!/^[a-f\d]{24}$/i.test(userId) || userId === currentUser.id) {
      return NextResponse.json({ error: "Choose a valid host" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

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

    return NextResponse.json({ id: chat.id }, { headers: { "Cache-Control": "private, no-store" } });
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
