"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat } from "@/app/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useLoginModal from "@/app/hooks/useLoginModal";
import Button from "@/app/components/Button";
import { useSSE } from "@/app/hooks/useSSE";
import { isOnline } from "@/app/helpers/presence";
import { formatDistanceToNowStrict } from "date-fns";

const MessagesPage = () => {
  const [chats, setChats] = useState<SafeChat[] | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();
  const loginModal = useLoginModal();

  useEffect(() => {
    axios
      .get("/api/chats")
      .then((res) => setChats(res.data))
      .catch((err) => {
        setChats([]);
        if (err.response?.status === 401) setUnauthorized(true);
      });
  }, []);

  const upsertChat = useCallback((incoming: SafeChat) => {
    setChats((prev) => {
      const list = prev ?? [];
      const withoutIncoming = list.filter((c) => c.id !== incoming.id);
      return [incoming, ...withoutIncoming].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, []);

  useSSE({
    url: chats && !unauthorized ? "/api/chats/stream" : null,
    handlers: {
      "chat-update": (data) => upsertChat(data as SafeChat),
    },
  });

  if (!chats) {
    return (
      <div className="pt-24 px-4 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
        <div className="h-20 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="h-20 bg-gray-200 dark:bg-neutral-700 rounded" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <Container>
        <div className="max-w-xs mx-auto py-40 flex justify-center">
          <Button label="Login to view messages" onClick={loginModal.onOpen} />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-2xl mx-auto py-8">
        <Heading title="Messages" subtitle="Your conversations" />
        <div className="mt-6 flex flex-col gap-3">
          {chats.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No conversations yet. Message a host from one of your bookings to get started.
            </p>
          )}
          {chats.map((chat) => {
            const online = isOnline(chat.otherUser?.lastActiveAt);
            const hasUnread = chat.unreadCount > 0;
            return (
              <div
                key={chat.id}
                onClick={() => router.push(`/messages/${chat.id}`)}
                className="p-4 border-[2px] dark:border-neutral-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 flex gap-3 items-center"
              >
                <div className="relative shrink-0">
                  <Image
                    src={chat.otherUser?.image || "/images/placeholder.png"}
                    alt={chat.otherUser?.name || "User"}
                    width={44}
                    height={44}
                    className="rounded-full object-cover w-11 h-11"
                  />
                  {online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-neutral-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`truncate dark:text-neutral-100 ${
                        hasUnread ? "font-bold" : "font-semibold"
                      }`}
                    >
                      {chat.otherUser?.name || chat.otherUser?.email}
                    </div>
                    {chat.lastMessage && (
                      <div className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">
                        {formatDistanceToNowStrict(new Date(chat.lastMessage.createdAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div
                      className={`text-sm truncate ${
                        hasUnread
                          ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                          : "text-gray-600 dark:text-neutral-400"
                      }`}
                    >
                      {chat.lastMessage
                        ? chat.lastMessage.imageUrl && !chat.lastMessage.text
                          ? "📷 Photo"
                          : chat.lastMessage.text
                        : "Say hello 👋"}
                    </div>
                    {hasUnread && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-limespark text-graphite font-semibold text-xs flex items-center justify-center">
                        {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );
};

export default MessagesPage;
