"use client";

import Container from "@/app/components/Container";
import ChatSidebar from "@/app/components/messages/ChatSidebar";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <Container>
      <div className="py-3 sm:py-8">
        <div className="-mx-4 flex h-[calc(100dvh-6.75rem)] min-h-[420px] max-w-[1280px] overflow-hidden border-y border-hairline-soft bg-white sm:mx-auto sm:h-[calc(100dvh-8rem)] sm:rounded-md sm:border sm:shadow-card md:min-h-[560px]">
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
