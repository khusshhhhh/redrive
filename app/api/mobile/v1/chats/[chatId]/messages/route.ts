import { messageRequestSchema, objectIdSchema, paginationQuerySchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { toSafeMessage } from "@/app/libs/chatSerializers";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { executeIdempotent } from "@/app/libs/mobile-api/idempotency";
import { mobileError, mobileJson, mobileUnexpectedError, mobileValidationError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";
import { notificationService } from "@/app/services/notificationService";

type Context = { params: Promise<{ chatId: string }> };

async function participant(chatId: string, userId: string) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  return chat?.participantIds.includes(userId) ? chat : null;
}

async function GETHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { chatId } = await context.params;
  if (!objectIdSchema.safeParse(chatId).success) return mobileError(request, 400, "INVALID_CHAT_ID", "That conversation identifier is invalid.");
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  if (!await participant(chatId, auth.identity.userId)) return mobileError(request, 404, "CHAT_NOT_FOUND", "That conversation was not found.");
  const rows = await prisma.message.findMany({ where: { chatId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: parsed.data.limit + 1, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}) });
  const hasMore = rows.length > parsed.data.limit;
  const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
  return mobileJson(request, { data: pageRows.map(toSafeMessage), page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
}

async function POSTHandler(request: Request, context: Context) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const { chatId } = await context.params;
  if (!objectIdSchema.safeParse(chatId).success) return mobileError(request, 400, "INVALID_CHAT_ID", "That conversation identifier is invalid.");
  const parsed = await parseMobileJson(request, messageRequestSchema);
  if (!parsed.ok) return parsed.response;
  const chat = await participant(chatId, auth.identity.userId);
  if (!chat) return mobileError(request, 404, "CHAT_NOT_FOUND", "That conversation was not found.");
  return executeIdempotent({ request, actorUserId: auth.identity.userId, scope: `chat:${chatId}:message`, payload: parsed.data, handler: async () => {
    const message = await prisma.message.create({ data: { chatId, senderId: auth.identity.userId, text: parsed.data.text || null, imageUrl: parsed.data.imageUrl || null, readByIds: [auth.identity.userId] } });
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    const recipientId = chat.participantIds.find((id) => id !== auth.identity.userId);
    if (recipientId) {
      const sender = await prisma.user.findUnique({ where: { id: auth.identity.userId }, select: { name: true } });
      await notificationService.notifyMessageReceived(recipientId, sender?.name || "Someone", chatId, parsed.data.text || "Sent an image").catch((error) => console.error("Message notification failed", error));
    }
    return { status: 201, body: toSafeMessage(message) };
  } }).catch((error) => mobileUnexpectedError(request, error, "Mobile message send failed"));
}

export const GET = monitorApiRoute("/api/mobile/v1/chats/[chatId]/messages", GETHandler, "GET");
export const POST = monitorApiRoute("/api/mobile/v1/chats/[chatId]/messages", POSTHandler, "POST");
