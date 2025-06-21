"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat, SafeMessage } from "@/app/types";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { IconSend } from "@tabler/icons-react";

const ChatPage = () => {
  const { chatId } = useParams();
  const [chat, setChat] = useState<SafeChat | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;
    axios
      .get(`/api/chats/${chatId}`)
      .then((res) => setChat(res.data))
      .catch(() => toast.error("Failed to load chat"));
    axios.get("/api/auth/user").then((res) => setCurrentUserId(res.data.id));
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/chats/${chatId}`, { text });
      setChat((prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.data as SafeMessage] } : prev
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
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <Container>
      <div className="max-w-2xl mx-auto py-8">
        <Heading title={chat.otherUser?.name || "Conversation"} subtitle="" />
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto border p-4 rounded-md">
          {chat.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.senderId === currentUserId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-lg max-w-xs animate-fadeIn ${
                  m.senderId === currentUserId ? "bg-teal-500 text-white" : "bg-gray-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            disabled={sending}
            className="bg-teal-500 text-white px-4 rounded flex items-center justify-center"
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </Container>
  );
};

export default ChatPage;
