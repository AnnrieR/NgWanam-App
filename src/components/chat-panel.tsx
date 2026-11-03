"use client";

import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";

import { Bot, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/app/(protected)/chatbot/actions";
import { MAX_CHAT_QUESTION, type AssistantReply } from "@/lib/chat-assistant";
import { ChatOrderCard } from "@/components/chat-order-card";

export type ChatMessage = { from: "assistant" | "user"; text: string } & Partial<Omit<AssistantReply, "text">>;

const greeting: ChatMessage = {
  from: "assistant",
  text: "Hi! Ask me about the menu, delivery, hours, payment, or ordering.",
};

const suggestions = [
  "Track my order",
  "What is on the menu?",
  "How much is the delivery fee?",
  "What are your operating hours?",
  "How can I pay for my order?",
  "Where do you deliver?",
];

/** Shared AI support UI. Keys, authorization, data lookup and budgets are server-only. */
export function ChatPanel({ className, messageClassName, customerName, role }: { className?: string; messageClassName?: string; customerName?: string | null; role?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([customerName ? { from: "assistant", text: `Hello ${customerName.split(" ")[0]}! 👋\nI'm your food assistant. As a ${role || "customer"}, I can help with orders, menu information, and tracking your deliveries.` } : greeting]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageId = useId();
  const sendingRef = useRef(false);
  const requestRef = useRef(0);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let activeHistoryKey: string | null = null;
    // Account-scoped storage: another signed-in customer never sees this chat.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const key = `ng-wanam-chat:${session?.user.id ?? "guest"}`;
      if (key === activeHistoryKey) return;
      activeHistoryKey = key;
      requestRef.current += 1;
      sendingRef.current = false;
      setIsSending(false);
      setDraft("");
      sessionRef.current = null;
      let restored: ChatMessage[] = [];
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (Array.isArray(saved?.messages)) {
          restored = saved.messages.filter((item: ChatMessage) => item && ["user", "assistant"].includes(item.from) && typeof item.text === "string").slice(-100);
        }
        if (typeof saved?.sessionId === "string") sessionRef.current = saved.sessionId;
      } catch { /* Corrupt or disabled storage must not break the assistant. */ }
      setMessages(restored.length ? restored : [customerName ? { from: "assistant", text: `Hello ${customerName.split(" ")[0]}! 👋\nI'm your food assistant. As a ${role || "customer"}, I can help with orders, menu information, and tracking your deliveries.` } : greeting]);
      setHistoryKey(key);
    });
    return () => subscription.unsubscribe();
  }, [customerName, role]);

  useEffect(() => {
    if (!historyKey) return;
    try {
      window.localStorage.setItem(historyKey, JSON.stringify({ messages: messages.slice(-100), sessionId: sessionRef.current }));
    } catch { /* The conversation still works if storage is full or blocked. */ }
  }, [historyKey, messages]);

  useEffect(() => () => { requestRef.current += 1; }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  /**
   * One id per browser conversation. It is created on first use rather than
   * during render, so the server never produces one that hydration would
   * have to reconcile (a ref is not rendered into the HTML at all).
   */
  function sessionId() {
    sessionRef.current ??= crypto.randomUUID();
    return sessionRef.current;
  }

  /**
   * Counts the exchange for the admin report. A failed log must never break
   * the conversation itself, so the rejection is swallowed on purpose.
   */
  function record(question: string, answer: string) {
    void createClient()
      .rpc("log_chatbot_conversation", { p_session_id: sessionId(), p_question: question, p_answer: answer })
      .then(
        () => undefined,
        () => undefined,
      );
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || text.length > MAX_CHAT_QUESTION || !historyKey || sendingRef.current) return;
    sendingRef.current = true;
    const request = ++requestRef.current;

    setDraft("");
    setMessages((current) => [...current, { from: "user", text }]);
    setIsSending(true);
    let reply: ChatMessage;
    try {
      reply = { from: "assistant", ...await askAssistant(text) };
    } catch {
      reply = { from: "assistant", source: "fallback", text: "Support is unavailable right now. Please try again later. You can still check Home, Checkout or My Orders directly." };
    }
    if (requestRef.current !== request) return;
    setMessages((current) => [...current, reply]);
    setIsSending(false);
    sendingRef.current = false;
    record(text, `[${reply.source ?? "fallback"}] ${reply.tracking ? `${reply.text} Order #${reply.tracking.number}: ${reply.tracking.status}.` : reply.text}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto pr-1" ref={scrollRef}>
        {messages.map((item, index) => (
          <div className={cn("flex", item.from === "user" ? "justify-end" : "justify-start")} data-chat-message={item.from} data-assistant-source={item.source} key={`${item.from}-${index}`}>
            {item.from === "assistant" && <span className="mt-1 me-2 grid size-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"><Bot className="size-5" /></span>}
            <div className={cn("min-w-0 max-w-[90%] rounded-2xl px-4 py-3 text-sm", item.tracking && "w-full", item.from === "user" ? "bg-orange-50 text-slate-900 dark:bg-orange-950 dark:text-slate-100" : "bg-stone-100 text-stone-800 dark:bg-slate-800 dark:text-slate-200", messageClassName)}>
              {item.from === "assistant" && item.source && <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">{item.source === "gemini" ? "Gemini AI" : item.source === "database" ? "Account lookup · not AI-generated" : "Saved help · AI not used"}</p>}
              <p className="whitespace-pre-line">{item.text}</p>
              {item.notice && <p className="mt-2 text-xs text-muted-foreground">{item.notice}</p>}
              {item.tracking && <ChatOrderCard order={item.tracking} />}
              {item.href && <Link href={item.href} className="mt-3 inline-block text-xs font-semibold text-red-600 underline dark:text-red-400">{item.linkLabel}</Link>}
            </div>
          </div>
        ))}
        {isSending && (
          <div role="status" aria-label="Chatbot is typing" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"><Bot className="size-5" /></span>
            <span aria-hidden="true" className="flex gap-1.5 rounded-2xl bg-stone-100 px-4 py-4 dark:bg-slate-800">{[0, 150, 300].map((delay) => <span key={delay} className="size-2 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }} />)}</span>
            <span className="sr-only">Chatbot is typing…</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((text) => (
          <Button variant="ghost"
            className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
            disabled={isSending || !historyKey}
            key={text}
            type="button"
            onClick={() => void ask(text)}
          >
            {text}
          </Button>
        ))}
      </div>

      <Form className="mt-4 flex gap-2" onSubmit={submit}>
        <Label className="sr-only" htmlFor={messageId}>Ask the Ng Wanam assistant</Label>
        <Input
          disabled={isSending || !historyKey}
          id={messageId}
          maxLength={MAX_CHAT_QUESTION}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about the menu, delivery, hours…"
          value={draft}
        />
         <Button aria-label="Send message" disabled={isSending || !historyKey || !draft.trim()} size="icon" type="submit">
          <Send />
        </Button>
      </Form>
      <p className="mt-2 text-xs text-muted-foreground">Signed-in questions may be sent to Google Gemini. Don&apos;t share personal details or secrets. Chats are saved on this browser and logged for restaurant support. Order lookups stay in the app; cards show the status when asked.</p>
    </div>
  );
}
