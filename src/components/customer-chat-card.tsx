import Link from "next/link";
import { ArrowRight, Bot, MessageCircle } from "lucide-react";

export function CustomerChatCard() {
  return (
    <aside className="h-fit rounded-2xl border border-orange-200 bg-orange-50/70 p-5 dark:border-orange-900 dark:bg-orange-950/30">
      <div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-orange-500 text-white"><Bot className="size-8" /></span><div><h2 className="text-sm font-bold">Ng Wanam Assist</h2><p className="mt-1 text-xs text-red-600 dark:text-orange-300">Your food &amp; order guide</p></div></div>
      <p className="my-5 text-sm leading-6 text-slate-600 dark:text-slate-300">Get help with orders, menu recommendations, and FAQs.</p>
      <Link href="/chatbot" className="flex items-center justify-between gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950"><MessageCircle className="size-4" />Ask a question<ArrowRight className="ml-auto size-4" /></Link>
    </aside>
  );
}
