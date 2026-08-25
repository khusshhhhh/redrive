import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { notificationService } from "@/app/services/notificationService";
import { toSafeMessage, toSafeChatUser } from "@/app/libs/chatSerializers";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";

const PAGE_SIZE = 30;

function validChatImage(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && url.pathname.includes("/redrive/chat/");
  } catch {
    return false;
  }
}

// GET: paginated message history, newest page first.
// ?before=<messageId> to load older messages (infinite-scroll-up).
async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    if (!/^[a-f\d]{24}$/i.test(chatId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const beforeId = request.nextUrl.searchParams.get("before");
    let cursorDate: Date | undefined;
    if (beforeId) {
      if (!/^[a-f\d]{24}$/i.test(beforeId)) return NextResponse.json({ error: "Invalid message cursor" }, { status: 400 });
      const cursorMessage = await prisma.message.findFirst({ where: { id: beforeId, chatId } });
      if (!cursorMessage) return NextResponse.json({ error: "Invalid message cursor" }, { status: 400 });
      cursorDate = cursorMessage?.createdAt;
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    });

    const hasMore = messages.length === PAGE_SIZE;

    // Only fetch otherUser on the initial (non-paginated) load — the
    // client already has it after that.
    let otherUser = null;
    if (!beforeId) {
      const otherId = chat.participantIds.find((id) => id !== currentUser.id);
      const otherUserRecord = otherId ? await prisma.user.findUnique({ where: { id: otherId } }) : null;
      otherUser = otherUserRecord ? toSafeChatUser(otherUserRecord) : null;
    }

    return NextResponse.json({
      messages: messages.reverse().map(toSafeMessage),
      hasMore,
      otherUser,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("GET /api/chats/[chatId]/messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: send a message (text and/or an already-uploaded Cloudinary image URL).
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await consumeRateLimits([
      { scope: "message-send-user", identifier: currentUser.id, limit: 60, windowMs: 60_000 },
      { scope: "message-send-ip", identifier: getClientIp(request), limit: 120, windowMs: 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const { chatId } = await params;
    if (!/^[a-f\d]{24}$/i.test(chatId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 16_384) return NextResponse.json({ error: "Message is too large" }, { status: 413 });
    const { text, imageUrl } = await request.json().catch(() => ({}));

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (trimmedText.length > 2_000 || !validChatImage(imageUrl)) {
      return NextResponse.json({ error: "Message contains an invalid or oversized value" }, { status: 400 });
    }
    if (!trimmedText && !imageUrl) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: currentUser.id,
        text: trimmedText || null,
        imageUrl: imageUrl || null,
        readByIds: [currentUser.id],
      },
    });

    // Bump the chat's updatedAt (inbox sort) and clear any typing indicator
    // for the sender — sending implies they've stopped typing.
    await prisma.chat.update({
      where: { id: chatId },
      data:
        chat.typingUserId === currentUser.id
          ? { typingUserId: null, typingAt: null }
          : {},
    });

    const otherUserId = chat.participantIds.find((id) => id !== currentUser.id);
    if (otherUserId) {
      try {
        await notificationService.notifyMessageReceived(
          otherUserId,
          currentUser.name || "Someone",
          chatId,
          trimmedText || "Sent an image"
        );
      } catch (notificationError) {
        console.error("Error sending message notification:", notificationError);
      }
    }

    return NextResponse.json(toSafeMessage(message), { status: 201 });
  } catch (error) {
    console.error("POST /api/chats/[chatId]/messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET = monitorApiRoute("/api/chats/[chatId]/messages", GETHandler, "GET");

export const POST = monitorApiRoute("/api/chats/[chatId]/messages", POSTHandler, "POST");
