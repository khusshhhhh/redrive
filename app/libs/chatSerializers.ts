import prisma from "@/app/libs/prismadb";

export interface RawMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  system?: boolean;
  readByIds: string[];
  createdAt: Date;
}

export function toSafeMessage(message: RawMessage) {
  return {
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    text: message.text,
    imageUrl: message.imageUrl,
    system: message.system ?? false,
    readByIds: message.readByIds,
    createdAt: message.createdAt.toISOString(),
  };
}

interface RawUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  lastActiveAt: Date | null;
}

export function toSafeChatUser(user: RawUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
  };
}

interface RawChatWithLastMessage {
  id: string;
  participantIds: string[];
  createdAt: Date;
  updatedAt: Date;
  messages: RawMessage[];
}

// Shared by GET /api/chats (initial inbox load) and GET /api/chats/stream
// (live inbox updates) so both produce an identical summary shape.
export async function buildChatSummary(chat: RawChatWithLastMessage, currentUserId: string) {
  const otherId = chat.participantIds.find((id) => id !== currentUserId);
  const [otherUser, unreadCount] = await Promise.all([
    otherId ? prisma.user.findUnique({ where: { id: otherId } }) : null,
    prisma.message.count({
      where: {
        chatId: chat.id,
        senderId: { not: currentUserId },
        NOT: { readByIds: { has: currentUserId } },
      },
    }),
  ]);

  const last = chat.messages[0];

  return {
    id: chat.id,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    unreadCount,
    otherUser: otherUser ? toSafeChatUser(otherUser) : null,
    lastMessage: last ? toSafeMessage(last) : null,
  };
}
