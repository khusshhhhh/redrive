"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Container from "@/app/components/Container";
import { SafeChatUser, SafeMessage } from "@/app/types";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconSend, IconArrowLeft, IconPaperclip, IconX } from "@tabler/icons-react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import ChatBubble from "@/app/components/messages/ChatBubble";
import ChatSidebar from "@/app/components/messages/ChatSidebar";
import TypingIndicator from "@/app/components/messages/TypingIndicator";
import { useSSE } from "@/app/hooks/useSSE";
import { isOnline } from "@/app/helpers/presence";
import InlineRetry from "@/app/components/InlineRetry";

const TYPING_SEND_THROTTLE_MS = 2000;
const TYPING_STOP_DELAY_MS = 3000;
const TYPING_INCOMING_EXPIRY_MS = 3500;
const NEAR_BOTTOM_THRESHOLD_PX = 150;

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<SafeChatUser | null>(null);
  const [messages, setMessages] = useState<SafeMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [streamSince, setStreamSince] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const isTypingRef = useRef(false);
  const sendInFlightRef = useRef(false);

  // Initial load: current user id + first page of messages + otherUser.
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setOtherUser(null);
    setStreamSince(null);
    setLoadError(false);
    seenIdsRef.current = new Set();

    axios.get("/api/auth/user").then((res) => {
      if (!cancelled) setCurrentUserId(res.data.id);
    }).catch(() => {});

    axios
      .get(`/api/chats/${chatId}/messages`)
      .then((res) => {
        if (cancelled) return;
        const { messages: initial, hasMore: more, otherUser: other } = res.data;
        initial.forEach((m: SafeMessage) => seenIdsRef.current.add(m.id));
        setMessages(initial);
        setHasMore(more);
        setOtherUser(other);
        setStreamSince(
          initial.length > 0 ? initial[initial.length - 1].createdAt : new Date(0).toISOString()
        );
        setLoading(false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatId, reloadKey]);

  const markRead = useCallback(() => {
    if (!chatId) return;
    axios.post(`/api/chats/${chatId}/read`).catch(() => {});
  }, [chatId]);

  // Mark read once the initial history is in.
  useEffect(() => {
    if (!loading) markRead();
  }, [loading, markRead]);

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
  };

  const handleIncomingMessage = useCallback(
    (data: SafeMessage) => {
      if (seenIdsRef.current.has(data.id)) return;
      seenIdsRef.current.add(data.id);
      const shouldStick = isNearBottom();
      setMessages((prev) => [...prev, data]);
      if (data.senderId !== currentUserId && document.visibilityState === "visible") {
        markRead();
      }
      if (shouldStick) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    },
    [currentUserId, markRead]
  );

  const handleTypingEvent = useCallback((data: { userId: string; isTyping: boolean }) => {
    if (!data.isTyping) return;
    setOtherTyping(true);
    if (typingExpireTimerRef.current) clearTimeout(typingExpireTimerRef.current);
    typingExpireTimerRef.current = setTimeout(() => setOtherTyping(false), TYPING_INCOMING_EXPIRY_MS);
  }, []);

  const handleReadEvent = useCallback((data: { messageIds: string[] }) => {
    setMessages((prev) =>
      prev.map((m) =>
        data.messageIds.includes(m.id) && otherUser && !m.readByIds.includes(otherUser.id)
          ? { ...m, readByIds: [...m.readByIds, otherUser.id] }
          : m
      )
    );
  }, [otherUser]);

  const streamUrl = useMemo(() => {
    if (!chatId || !streamSince) return null;
    return `/api/chats/${chatId}/stream?since=${encodeURIComponent(streamSince)}`;
    // Only recompute when the chat changes or the stream first becomes ready —
    // reconnects after that are handled by the browser via Last-Event-ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, streamSince !== null]);

  useSSE({
    url: streamUrl,
    handlers: {
      message: (data) => handleIncomingMessage(data as SafeMessage),
      typing: (data) => handleTypingEvent(data as { userId: string; isTyping: boolean }),
      read: (data) => handleReadEvent(data as { messageIds: string[] }),
    },
  });

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!chatId) return;
      isTypingRef.current = typing;
      axios.post(`/api/chats/${chatId}/typing`, { isTyping: typing }).catch(() => {});
    },
    [chatId]
  );

  const onTextChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      if (isTypingRef.current) sendTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAtRef.current > TYPING_SEND_THROTTLE_MS) {
      lastTypingSentAtRef.current = now;
      sendTyping(true);
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => sendTyping(false), TYPING_STOP_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (typingExpireTimerRef.current) clearTimeout(typingExpireTimerRef.current);
      if (isTypingRef.current && chatId) {
        axios.post(`/api/chats/${chatId}/typing`, { isTyping: false }).catch(() => {});
      }
    };
  }, [chatId]);

  const sendMessage = async () => {
    if (sendInFlightRef.current) return;
    const trimmed = text.trim();
    if (!trimmed && !pendingImageUrl) return;
    if (!currentUserId) return;

    sendInFlightRef.current = true;
    setSending(true);
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (isTypingRef.current) sendTyping(false);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: SafeMessage = {
      id: tempId,
      chatId: chatId as string,
      senderId: currentUserId,
      text: trimmed || null,
      imageUrl: pendingImageUrl,
      readByIds: [currentUserId],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setPendingImageUrl(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });

    try {
      const res = await axios.post(`/api/chats/${chatId}/messages`, {
        text: trimmed || undefined,
        imageUrl: optimisticMessage.imageUrl || undefined,
      });
      const confirmed: SafeMessage = res.data;
      seenIdsRef.current.add(confirmed.id);
      setMessages((prev) => {
        const tempIndex = prev.findIndex((message) => message.id === tempId);
        const withoutDuplicates = prev.filter((message) => message.id !== tempId && message.id !== confirmed.id);
        const insertAt = tempIndex < 0 ? withoutDuplicates.length : Math.min(tempIndex, withoutDuplicates.length);
        return [...withoutDuplicates.slice(0, insertAt), confirmed, ...withoutDuplicates.slice(insertAt)];
      });
    } catch {
      toast.error("Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      sendInFlightRef.current = false;
    }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image no larger than 10 MB");
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", "chat");
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      setPendingImageUrl(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attachment upload failed");
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    try {
      const res = await axios.get(`/api/chats/${chatId}/messages`, {
        params: { before: messages[0].id },
      });
      const { messages: older, hasMore: more } = res.data;
      older.forEach((m: SafeMessage) => seenIdsRef.current.add(m.id));
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch {
      toast.error("Failed to load older messages");
    }
    setLoadingOlder(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-6">
        <div className="h-6 shimmer rounded w-1/3" />
        <div className="h-20 shimmer rounded" />
      </div>
    );
  }

  if (loadError) return <Container><div className="py-8"><InlineRetry title="Conversation unavailable" message="Your messages are still safe. Check your connection and try loading the conversation again." onRetry={() => setReloadKey((value) => value + 1)} /></div></Container>;

  const online = isOnline(otherUser?.lastActiveAt);

  return (
    <Container>
      <div className="py-3 sm:py-8">
        <div className="-mx-4 flex h-[calc(100dvh-6.75rem)] min-h-[420px] max-w-[1280px] overflow-hidden border-y border-hairline-soft bg-white sm:mx-auto sm:h-[calc(100dvh-8rem)] sm:rounded-md sm:border sm:shadow-card md:min-h-[560px]">
          <ChatSidebar activeChatId={chatId} className="hidden w-[340px] md:flex" />
          <section className="flex min-w-0 flex-1 flex-col bg-surface-soft/30">
            <header className="flex h-[76px] shrink-0 items-center gap-3 border-b border-hairline-soft bg-white px-4 sm:px-6">
              <button onClick={() => router.push("/messages")} className="rounded-full p-2 text-ink hover:bg-surface-soft md:hidden" aria-label="Back to conversations"><IconArrowLeft size={20} /></button>
              <div className="relative shrink-0">
                <Image src={otherUser?.image || "/images/placeholder.png"} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{otherUser?.name || "Conversation"}</div>
                <div className="text-xs text-muted">{otherTyping ? <span className="font-medium text-primary">typing…</span> : online ? "Online" : otherUser?.lastActiveAt ? `Last seen ${format(new Date(otherUser.lastActiveAt), "p")}` : ""}</div>
              </div>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-6">
              {hasMore && <button onClick={loadOlder} disabled={loadingOlder} className="mx-auto block rounded-full bg-white px-4 py-2 text-xs font-medium text-ink shadow-sm disabled:opacity-50">{loadingOlder ? "Loading…" : "Load older messages"}</button>}
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDivider = !previous || !isSameDay(new Date(previous.createdAt), new Date(message.createdAt));
                return (
                  <div key={message.id}>
                    {showDivider && <div className="my-4 text-center"><span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted shadow-sm">{dayLabel(new Date(message.createdAt))}</span></div>}
                    <ChatBubble message={message} isOwn={message.senderId === currentUserId} otherUserId={otherUser?.id} pending={message.id.startsWith("temp-")} />
                  </div>
                );
              })}
              {otherTyping && <TypingIndicator />}
            </div>

            <footer className="safe-bottom shrink-0 border-t border-hairline-soft bg-white px-3 pt-3 sm:p-4">
              {pendingImageUrl && <div className="relative mb-3 h-20 w-20"><Image src={pendingImageUrl} alt="Attachment ready to send" fill className="rounded-md object-cover" /><button onClick={() => setPendingImageUrl(null)} className="absolute -right-2 -top-2 rounded-full bg-ink p-0.5 text-white"><IconX size={14} /></button></div>}
              <div className="flex items-center gap-2 sm:gap-3">
                <input ref={attachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadAttachment(event.target.files?.[0])} />
                <button type="button" disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()} aria-label={uploadingAttachment ? "Uploading attachment" : "Attach an image"} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition hover:bg-surface-soft disabled:cursor-wait">
                  {uploadingAttachment ? <span className="loader-orbit h-5 w-5 rounded-full border-2 border-hairline border-t-primary" /> : <IconPaperclip size={20} />}
                </button>
                <input value={text} onChange={(event) => onTextChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} className="h-11 min-w-0 flex-1 rounded-full border border-hairline bg-white px-4 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Type a message" />
                <button onClick={() => void sendMessage()} disabled={sending || uploadingAttachment || (!text.trim() && !pendingImageUrl)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-active disabled:opacity-50" aria-label="Send message">{sending ? <span className="loader-orbit h-5 w-5 rounded-full border-2 border-white/40 border-t-white" /> : <IconSend size={20} />}</button>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </Container>
  );
};

export default ChatPage;
