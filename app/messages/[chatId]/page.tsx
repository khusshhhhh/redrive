"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat, SafeMessage } from "@/app/types";
import { useParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

const ChatPage = () => {
  const { chatId } = useParams();
  const [chat, setChat] = useState<SafeChat | null>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    axios.get(`/api/chats/${chatId}`).then(res => setChat(res.data)).catch(() => toast.error("Failed to load chat"));
  }, [chatId]);

  const sendMessage = async () => {
    if (!text && !image) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/chats/${chatId}`, { text, imageUrl: image });
      setChat(prev => prev ? { ...prev, messages: [...prev.messages, res.data as SafeMessage] } : prev);
      setText("");
      setImage(null);
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
        <Heading title="Conversation" subtitle="" />
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto border p-4 rounded-md">
          {chat.messages.map(m => (
            <div key={m.id} className="flex flex-col">
              <div className="text-sm text-gray-600">{m.sender.name || m.sender.email}</div>
              {m.text && <div className="p-2">{m.text}</div>}
              {m.imageUrl && (
                <Image src={m.imageUrl} alt="photo" width={200} height={200} className="rounded" />
              )}
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
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
          }} />
          <button onClick={sendMessage} disabled={sending} className="bg-teal-500 text-white px-4 rounded">
            Send
          </button>
        </div>
        {image && (
          <div className="mt-2">
            <Image src={image} alt="preview" width={100} height={100} className="rounded" />
          </div>
        )}
      </div>
    </Container>
  );
};

export default ChatPage;
