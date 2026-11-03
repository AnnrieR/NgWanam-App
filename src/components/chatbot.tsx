"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3 sm:right-6 lg:bottom-6">
      {isOpen && (
        <aside aria-label="Ng Wanam Assist" className="flex h-[min(38rem,calc(100dvh-10rem))] w-[calc(100vw-2rem)] max-w-md flex-col rounded-3xl border border-stone-200 bg-background p-4 shadow-2xl shadow-stone-950/15 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">Ng Wanam Assist</p>
              <p className="text-xs text-muted-foreground">AI support · saved FAQ fallback</p>
            </div>
            <Button aria-label="Close assistant" onClick={() => setIsOpen(false)} size="icon-sm" variant="ghost">
              <X />
            </Button>
          </div>
          <ChatPanel className="min-h-0 flex-1" />
        </aside>
      )}
      <Button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Ng Wanam Assist" : "Open Ng Wanam Assist"}
        className="size-12 rounded-full shadow-lg"
        onClick={() => setIsOpen((open) => !open)}
        size="icon"
      >
        <MessageCircle />
      </Button>
    </div>
  );
}
