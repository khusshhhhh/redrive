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
        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-5 shadow-[0_1px_2px_rgba(24,54,58,0.08)] sm:max-w-[70%] ${
          isOwn
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm border border-hairline-soft bg-white text-ink"
        } ${pending ? "opacity-60" : ""}`}
      >
        {message.imageUrl && (
          <div className="relative w-48 h-48 mb-1 rounded-md overflow-hidden">
            <Image src={message.imageUrl} alt="Image shared in this conversation" fill className="object-cover" />
          </div>
        )}
        {message.text && <div className="whitespace-pre-wrap break-words">{message.text}</div>}
        <div
          className={`flex items-center gap-1 mt-1 text-[10px] ${
            isOwn ? "text-white/70 justify-end" : "text-muted"
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
