"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat } from "@/app/types";
import { useRouter } from "next/navigation";

const MessagesPage = () => {
  const [chats, setChats] = useState<SafeChat[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/chats").then(res => setChats(res.data)).catch(() => setChats([]));
  }, []);

  if (!chats) {
    return (
      <div className="pt-24 px-4 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <Container>
      <div className="max-w-2xl mx-auto py-8">
        <Heading title="Messages" subtitle="Your conversations" />
        <div className="mt-6 flex flex-col gap-4">
          {chats.map(chat => {
            const otherId = chat.participantIds.find(id => id !== chat.messages[0]?.senderId);
            const last = chat.messages[chat.messages.length - 1];
            return (
              <div
                key={chat.id}
                onClick={() => router.push(`/messages/${chat.id}`)}
                className="p-4 border-[2px] rounded-md cursor-pointer hover:bg-gray-50"
              >
                <div className="font-semibold">Chat with {otherId}</div>
                {last && (
                  <div className="text-sm text-gray-600 truncate">
                    {last.text || "Photo"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );
};

export default MessagesPage;
