"use client";

import ChatSidebar from "@/app/components/messages/ChatSidebar";
import { MessageCircle, ShieldCheck } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-[1440px] overflow-hidden border-x border-hairline-soft bg-white shadow-[0_18px_60px_rgba(22, 22, 22,0.08)]">
      <ChatSidebar className="flex w-full md:w-[380px]" />
      <section className="chat-canvas hidden min-w-0 flex-1 flex-col items-center justify-center px-8 text-center md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/10 bg-white text-primary shadow-[0_16px_40px_rgba(113, 0, 20,0.12)]"><MessageCircle size={34} strokeWidth={1.7} /></div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Your Redrive conversations</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Choose a conversation to coordinate booking details and keep trip decisions together.</p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-hairline-soft bg-white/85 px-4 py-2 text-xs font-medium text-muted shadow-sm"><ShieldCheck size={15} className="text-primary" />Keep payments and important agreements on Redrive</div>
      </section>
    </div>
  );
}
