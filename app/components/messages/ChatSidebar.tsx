"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Search } from "lucide-react";

import type { SafeChat } from "@/app/types";
import { useLiveUpdates } from "@/app/hooks/useLiveUpdates";
import { userChannel } from "@/app/libs/realtime/events";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import { isOnline } from "@/app/helpers/presence";
import useLoginModal from "@/app/hooks/useLoginModal";

interface ChatSidebarProps {
  activeChatId?: string;
  className?: string;
}

export default function ChatSidebar({ activeChatId, className = "" }: ChatSidebarProps) {
  const router = useRouter();
  const loginModal = useLoginModal();
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const [query, setQuery] = useState("");

  // SWR owns the base inbox list (dedup + focus/reconnect revalidation replace
  // the old manual fetch effect); realtime / SSE events merge into its cache.
  const { data, error, mutate } = useSWR<SafeChat[]>(
    currentUser ? "/api/chats" : null,
  );
  const chats = data ?? null;
  const unauthorized =
    (error as { status?: number } | undefined)?.status === 401 ||
    (!currentUser && !userLoading);

  const upsertChat = useCallback(
    (incoming: SafeChat) => {
      void mutate(
        (current) => {
          const list = current ?? [];
          return [incoming, ...list.filter((chat) => chat.id !== incoming.id)].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        },
        { revalidate: false },
      );
    },
    [mutate],
  );

  useLiveUpdates({
    channel: currentUser && !unauthorized ? userChannel(currentUser.id) : null,
    sseUrl: chats && !unauthorized ? "/api/chats/stream" : null,
    handlers: { "chat-update": (data) => upsertChat(data as SafeChat) },
  });

  const filteredChats = (chats ?? []).filter((chat) => {
    const name = chat.otherUser?.name || chat.otherUser?.email || "";
    return name.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <aside className={`min-h-0 flex-col border-r border-hairline-soft bg-white ${className}`}>
      <div className="shrink-0 border-b border-hairline-soft px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Inbox</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Messages</h1></div>
          {chats && !unauthorized && <span className="pb-1 text-xs font-medium text-muted">{chats.length} conversation{chats.length === 1 ? "" : "s"}</span>}
        </div>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-full border border-hairline-soft bg-surface-soft/70 px-4 text-muted transition focus-within:border-primary focus-within:bg-white focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-soft"
          />
        </label>
      </div>

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2" aria-label="Conversations">
        {!chats && !unauthorized && Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3">
            <div className="skeleton-wave h-12 w-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2"><div className="skeleton-wave h-4 w-2/3 rounded" /><div className="skeleton-wave h-3 w-full rounded" /></div>
          </div>
        ))}

        {unauthorized && (
          <div className="p-6 text-center">
            <p className="text-sm text-muted">Sign in to see your conversations.</p>
            <button onClick={() => loginModal.onOpen()} className="mt-4 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-active">Log in</button>
          </div>
        )}

        {chats && !unauthorized && filteredChats.length === 0 && (
          <div className="p-6 text-center text-sm leading-6 text-muted">
            {query ? "No conversations match your search." : "No conversations yet. Start one from a reservation."}
          </div>
        )}

        {filteredChats.map((chat) => {
          const online = isOnline(chat.otherUser?.lastActiveAt);
          const active = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              onClick={() => router.push(`/messages/${chat.id}`)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-surface-strong shadow-[inset_3px_0_0_#1F1F1F]" : "hover:bg-surface-soft"}`}
            >
              <span className="relative shrink-0">
                <Image src={chat.otherUser?.image || "/images/placeholder.png"} alt={`${chat.otherUser?.name || "Conversation member"} profile photo`} width={48} height={48} className="h-12 w-12 rounded-[28%] object-cover" />
                {online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm text-ink ${chat.unreadCount ? "font-bold" : "font-semibold"}`}>{chat.otherUser?.name || chat.otherUser?.email || "Conversation"}</span>
                  {chat.lastMessage && <span className="shrink-0 text-[10px] text-muted-soft">{formatDistanceToNowStrict(new Date(chat.lastMessage.createdAt), { addSuffix: true })}</span>}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${chat.unreadCount ? "font-semibold text-ink" : "text-muted"}`}>
                    {chat.lastMessage ? (chat.lastMessage.imageUrl && !chat.lastMessage.text ? "Photo" : chat.lastMessage.text) : "Say hello"}
                  </span>
                  {chat.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{chat.unreadCount > 9 ? "9+" : chat.unreadCount}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
