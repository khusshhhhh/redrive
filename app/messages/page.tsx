"use client";

import Container from "@/app/components/Container";
import ChatSidebar from "@/app/components/messages/ChatSidebar";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <Container>
      <div className="py-6 sm:py-8">
        <div className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[560px] max-w-[1280px] overflow-hidden rounded-md border border-hairline-soft bg-white shadow-card">
          <ChatSidebar className="flex w-full md:w-[340px]" />
          <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-surface-soft/40 px-8 text-center md:flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-strong text-primary"><MessageCircle size={28} /></div>
            <h2 className="mt-5 text-xl font-semibold text-ink">Choose a conversation</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">Select someone from the left to read your messages and continue the conversation.</p>
          </section>
        </div>
      </div>
    </Container>
  );
}
