"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeChat } from "@/app/types";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useLoginModal from "@/app/hooks/useLoginModal";
import Button from "@/app/components/Button";

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

  if (!chats) {
    return (
      <div className="pt-24 px-4 animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
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
        <div className="mt-6 flex flex-col gap-4">
          {chats.map((chat) => {
            const last = chat.messages[chat.messages.length - 1];
            return (
              <div
                key={chat.id}
                onClick={() => router.push(`/messages/${chat.id}`)}
                className="p-4 border-[2px] rounded-md cursor-pointer hover:bg-gray-50 flex gap-3 items-center"
              >
                <Image
                  src={chat.otherUser?.image || "/images/placeholder.png"}
                  alt={chat.otherUser?.name || "User"}
                  width={40}
                  height={40}
                  className="rounded-md object-cover"
                />
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {chat.otherUser?.name || chat.otherUser?.email}
                  </div>
                  {last && (
                    <div className="text-sm text-gray-600 truncate">
                      {last.text || ""}
                    </div>
                  )}
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
