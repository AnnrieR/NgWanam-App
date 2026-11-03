
import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";
import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createChatbotRule, deleteChatbotRule, updateChatbotRule } from "../actions";
import { ConfirmAction } from "@/components/confirm-action";

function RuleFields({ intent = "", keywords = [], response = "" }: { intent?: string; keywords?: string[]; response?: string }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2 text-xs font-semibold">Intent / FAQ name<Input name="intent" defaultValue={intent} placeholder="e.g. store_hours" pattern="[a-z0-9_-]+" maxLength={100} required /></Label><Label className="grid gap-2 text-xs font-semibold">Keywords (comma-separated)<Input name="keywords" defaultValue={keywords.join(", ")} placeholder="hours, open, close" maxLength={1000} required /></Label><Label className="grid gap-2 text-xs font-semibold sm:col-span-2">Response<Textarea name="response" defaultValue={response} placeholder="The chatbot's saved response" maxLength={4000} required /></Label></div>;
}

export default async function FaqPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; updated?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", error, updated } = await searchParams;
  const supabase = await createClient();
  const result = await supabase.from("chatbot_rules").select("id, intent, keywords, response, is_active").order("intent");
  const needle = q.trim().toLowerCase();
  const rules = (result.data ?? []).filter((rule) => `${rule.intent} ${rule.keywords.join(" ")} ${rule.response}`.toLowerCase().includes(needle));
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Chatbot FAQ</h1><p className="mt-2 text-sm text-muted-foreground">Manage keyword-based FAQ records and saved responses. Order tracking uses the customer&apos;s live order data separately.</p></header>
    {(error || updated) && <p role="status" className={`rounded-xl p-4 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"}`}>{error === "confirm-delete" ? "Confirm deletion before removing an FAQ." : error ? "The FAQ could not be saved. Check that its intent is unique and all required fields are filled." : updated === "rule-deleted" ? "FAQ deleted." : "FAQ saved."}</p>}
    <Disclosure className="rounded-xl border bg-white p-5 dark:bg-slate-900"><DisclosureSummary className="cursor-pointer text-sm font-semibold text-red-600 dark:text-red-400">+ Add FAQ</DisclosureSummary><Form action={createChatbotRule} className="mt-5 space-y-4"><RuleFields /><Button type="submit">Add FAQ</Button></Form></Disclosure>
    <Form action="/admin/faq" className="flex gap-3"><Input name="q" type="search" defaultValue={q} aria-label="Search FAQ" placeholder="Search FAQs, keywords, or responses" className="max-w-md" /><Button type="submit" variant="outline">Search</Button></Form>
    {result.error && <p role="alert" className="text-sm text-red-600">FAQ records could not be loaded.</p>}
    <div className="space-y-4">{rules.map((rule) => <section key={rule.id} className="rounded-xl border bg-white p-5 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{rule.intent}</h2><span className={`text-xs font-semibold ${rule.is_active ? "text-green-700 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>{rule.is_active ? "Active" : "Disabled"}</span></div>
      <Form action={updateChatbotRule} className="space-y-4"><input type="hidden" name="ruleId" value={rule.id} /><RuleFields {...rule} /><div className="flex items-center gap-4"><Label className="flex items-center gap-2 text-xs"><Input type="checkbox" name="isActive" defaultChecked={rule.is_active} />Active response</Label><Button type="submit" size="sm">Save changes</Button></div></Form>
      <div className="mt-4 border-t pt-3"><ConfirmAction action={deleteChatbotRule} fields={{ ruleId: rule.id, confirmDelete: "on" }} title={`Delete ${rule.intent}?`} description="This permanently removes the saved FAQ response. This cannot be undone." triggerLabel="Delete FAQ" /></div>
    </section>)}</div>
    {!result.error && !rules.length && <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No FAQs match your search.</p>}
  </div>;
}
