"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat, SafeMessage } from "@/app/types";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconSend, IconArrowLeft } from "@tabler/icons-react";
import { format } from "date-fns";

const ChatPage = () => {
  const { chatId } = useParams();
  const router = useRouter();
  const [chat, setChat] = useState<SafeChat | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;
    const fetchChat = () =>
      axios
        .get(`/api/chats/${chatId}`)
        .then((res) => setChat(res.data))
        .catch(() => toast.error("Failed to load chat"));

    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    axios.get("/api/auth/user").then((res) => setCurrentUserId(res.data.id));
    return () => clearInterval(interval);
  }, [chatId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages.length]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/chats/${chatId}`, { text });
      setChat((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, res.data as SafeMessage] }
          : prev
      );
      setText("");
    } catch {
      toast.error("Failed to send");
    }
    setSending(false);
  };

  if (!chat) {
    return (
      <div className="pt-24 px-4 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
        <div className="h-20 bg-gray-200 dark:bg-neutral-700 rounded" />
      </div>
    );
  }

  return (
    <Container>
      <div className="w-full sm:max-w-2xl mx-auto py-8 px-2">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm text-teal-500 hover:underline"
        >
          <IconArrowLeft size={16} /> Back
        </button>
        <Heading title={chat.otherUser?.name || "Conversation"} subtitle="" />
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto border dark:border-neutral-700 p-2 sm:p-4 rounded-md bg-white dark:bg-neutral-800">
          {chat.messages.map((m) => {
            const isCurrent = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-1 ${isCurrent ? "justify-end" : "justify-start"}`}
              >
                {!isCurrent && (
                  <span className="text-xs text-gray-500 dark:text-neutral-400">
                    {format(new Date(m.createdAt), "p")}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] sm:max-w-xs animate-pop ${
                    isCurrent ? "bg-teal-500 text-white" : "bg-gray-100 dark:bg-neutral-700 dark:text-neutral-100"
                  }`}
                >
                  {m.text}
                </div>
                {isCurrent && (
                  <span className="text-xs text-gray-500 dark:text-neutral-400">
                    {format(new Date(m.createdAt), "p")}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-4 flex gap-2 sm:gap-4">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            className="flex-1 border dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 p-2 sm:p-3 rounded"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            disabled={sending}
            className="bg-teal-500 text-white px-4 sm:px-6 rounded flex items-center justify-center"
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </Container>
  );
};

export default ChatPage;
