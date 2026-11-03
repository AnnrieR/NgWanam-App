import Link from "next/link";
import { BookOpenText, Clock3, CreditCard, MapPin, MessageCircle, MessageCircleQuestion, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatPanel } from "@/components/chat-panel";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { requireRole } from "@/lib/auth";
import { CustomerServiceStrip } from "@/components/customer-service-strip";

const topics = [
  { icon: BookOpenText, label: "Menu & availability", text: "Dishes, servings, prices, and stock" },
  { icon: Truck, label: "Delivery", text: "Areas covered and how orders arrive" },
  { icon: Clock3, label: "Operating hours", text: "When Ng Wanam is open" },
  { icon: CreditCard, label: "Payment", text: "COD and manual GCash payments" },
  { icon: MapPin, label: "Location", text: "Where the kitchen is located" },
  { icon: MessageCircleQuestion, label: "Ordering help", text: "Placing, tracking, and cancelling" },
];

export default async function ChatbotPage() {
  const { profile } = await requireRole(["customer", "staff", "delivery", "admin"]);

  return (
    <CustomerDashboard avatarUrl={profile.avatar_url} fullName={profile.full_name} role={profile.role}>
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ng Wanam Assist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-assisted menu and restaurant support, with secure account lookups and saved FAQ fallback.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="flex h-[38rem] flex-col border border-stone-200 shadow-none dark:border-slate-700">
            <CardHeader className="border-b border-stone-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2"><MessageCircle className="size-4 text-red-600 dark:text-red-400" />Ng Wanam Assist</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
              <ChatPanel className="min-h-0 flex-1" customerName={profile.full_name} role={profile.role} />
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="border border-stone-200 shadow-none dark:border-slate-700">
              <CardHeader><CardTitle>What I can answer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topics.map(({ icon: Icon, label, text }) => (
                  <div className="flex gap-3" key={label}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"><Icon className="size-4" /></span>
                    <span className="min-w-0">
                      <strong className="block text-sm">{label}</strong>
                      <small className="block text-xs text-muted-foreground">{text}</small>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-stone-200 shadow-none dark:border-slate-700">
              <CardHeader><CardTitle>Still need help?</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Review your previous orders or ask about today&apos;s dishes.</p>
                <Button className="w-full" render={<Link href="/orders" />} size="sm">My orders</Button>
              </CardContent>
            </Card>
          </aside>
        </div>
        <CustomerServiceStrip />
      </div>
    </CustomerDashboard>
  );
}
