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
import TypingIndicator from "@/app/components/messages/TypingIndicator";
import { useSSE } from "@/app/hooks/useSSE";
import { isOnline } from "@/app/helpers/presence";

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const isTypingRef = useRef(false);

  // Initial load: current user id + first page of messages + otherUser.
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

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
          toast.error("Failed to load conversation");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

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
    const trimmed = text.trim();
    if (!trimmed && !pendingImageUrl) return;
    if (!currentUserId) return;

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
      setMessages((prev) => prev.map((m) => (m.id === tempId ? confirmed : m)));
    } catch {
      toast.error("Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
    setSending(false);
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Choose an image smaller than 5 MB");
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
      <div className="pt-24 px-4 space-y-6">
        <div className="h-6 shimmer rounded w-1/3" />
        <div className="h-20 shimmer rounded" />
      </div>
    );
  }

  const online = isOnline(otherUser?.lastActiveAt);

  return (
    <Container>
      <div className="w-full sm:max-w-2xl mx-auto py-8 px-2">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-ink hover:underline shrink-0"
          >
            <IconArrowLeft size={16} /> Back
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate text-ink">
              {otherUser?.name || "Conversation"}
            </div>
            <div className="text-xs text-muted">
              {otherTyping ? (
                <span className="text-ink font-medium">typing…</span>
              ) : online ? (
                "Online"
              ) : otherUser?.lastActiveAt ? (
                `Last seen ${format(new Date(otherUser.lastActiveAt), "p")}`
              ) : (
                ""
              )}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto border border-hairline p-2 sm:p-4 rounded-md bg-white"
        >
          {hasMore && (
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="text-xs text-ink hover:underline self-center mb-2 disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          )}

          {messages.map((m, index) => {
            const prev = messages[index - 1];
            const showDivider = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="text-center text-xs text-muted-soft my-2">
                    {dayLabel(new Date(m.createdAt))}
                  </div>
                )}
                <ChatBubble
                  message={m}
                  isOwn={m.senderId === currentUserId}
                  otherUserId={otherUser?.id}
                  pending={m.id.startsWith("temp-")}
                />
              </div>
            );
          })}

          {otherTyping && <TypingIndicator />}
        </div>

        {pendingImageUrl && (
          <div className="mt-3 relative w-20 h-20">
            <Image src={pendingImageUrl} alt="To send" fill className="object-cover rounded-md" />
            <button
              onClick={() => setPendingImageUrl(null)}
              className="absolute -top-2 -right-2 bg-ink text-white rounded-full p-0.5"
            >
              <IconX size={14} />
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-2 sm:gap-3 items-center">
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void uploadAttachment(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploadingAttachment}
            onClick={() => attachmentInputRef.current?.click()}
            aria-label={uploadingAttachment ? "Uploading attachment" : "Attach an image"}
            className="shrink-0 p-2 sm:p-3 rounded-full border border-hairline text-muted hover:shimmer transition disabled:cursor-wait disabled:opacity-50"
          >
            <IconPaperclip size={20} />
          </button>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1 border border-hairline focus:border-ink focus:border-2 outline-none p-2 sm:p-3 rounded-full px-4 text-ink"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            disabled={sending || (!text.trim() && !pendingImageUrl)}
            className="bg-primary text-white p-2 sm:p-3 rounded-full flex items-center justify-center hover:bg-primary-active disabled:opacity-50 shrink-0"
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </Container>
  );
};

export default ChatPage;
