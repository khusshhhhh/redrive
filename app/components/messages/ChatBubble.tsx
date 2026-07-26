"use client";

import Image from "next/image";
import { format } from "date-fns";
import { IconCheck, IconChecks } from "@tabler/icons-react";
import { SafeMessage } from "@/app/types";

interface ChatBubbleProps {
  message: SafeMessage;
  isOwn: boolean;
  otherUserId?: string;
  /** True while an optimistically-sent message hasn't been confirmed by the server yet. */
  pending?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn, otherUserId, pending }) => {
  const isRead = !!otherUserId && message.readByIds.includes(otherUserId);

  return (
    <div className={`flex items-end gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-3 py-2 rounded-2xl max-w-[80%] sm:max-w-xs animate-pop ${
          isOwn
            ? "bg-limespark text-graphite rounded-br-sm"
            : "bg-gray-100 dark:bg-neutral-700 dark:text-neutral-100 rounded-bl-sm"
        } ${pending ? "opacity-60" : ""}`}
      >
        {message.imageUrl && (
          <div className="relative w-48 h-48 mb-1 rounded-lg overflow-hidden">
            <Image src={message.imageUrl} alt="Shared image" fill className="object-cover" />
          </div>
        )}
        {message.text && <div className="whitespace-pre-wrap break-words">{message.text}</div>}
        <div
          className={`flex items-center gap-1 mt-1 text-[10px] ${
            isOwn ? "text-graphite/70 justify-end" : "text-gray-500 dark:text-neutral-400"
          }`}
        >
          <span>{format(new Date(message.createdAt), "p")}</span>
          {isOwn && !pending && (isRead ? <IconChecks size={14} /> : <IconCheck size={14} />)}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
