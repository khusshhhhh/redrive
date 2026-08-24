import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { buildChatSummary } from "@/app/libs/chatSerializers";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileError, mobileJson, mobileUnexpectedError, mobileValidationError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  try {
    const rows = await prisma.chat.findMany({ where: { participantIds: { has: auth.identity.userId } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: parsed.data.limit + 1, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}), include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } });
    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    const data = await Promise.all(pageRows.map((chat) => buildChatSummary(chat, auth.identity.userId)));
    return mobileJson(request, { data, page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile inbox failed");
  }
}

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ participantId: objectIdSchema }));
  if (!parsed.ok) return parsed.response;
  if (parsed.data.participantId === auth.identity.userId) return mobileError(request, 400, "INVALID_PARTICIPANT", "You cannot start a conversation with yourself.");
  const participant = await prisma.user.findUnique({ where: { id: parsed.data.participantId }, select: { id: true } });
  if (!participant) return mobileError(request, 404, "PARTICIPANT_NOT_FOUND", "That Redrive member was not found.");
  const participantIds = [auth.identity.userId, participant.id].sort();
  const existing = await prisma.chat.findFirst({ where: { participantIds: { hasEvery: participantIds } } });
  const chat = existing || await prisma.chat.create({ data: { participantIds } });
  return mobileJson(request, { id: chat.id, created: !existing }, existing ? 200 : 201);
}

export const GET = monitorApiRoute("/api/mobile/v1/chats", GETHandler, "GET");
export const POST = monitorApiRoute("/api/mobile/v1/chats", POSTHandler, "POST");
