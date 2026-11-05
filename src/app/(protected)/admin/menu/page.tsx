
import { Form } from "@/components/ui/form";
import Link from "next/link";

import { setMenuApproval } from "@/app/(protected)/admin/actions";
import { MenuImage } from "@/components/menu-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/embedded";
import { createClient } from "@/lib/supabase/server";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });

type MenuApprovalsPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

type RawItem = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  decided_at?: string | null;
  categories?: { name?: string } | Array<{ name?: string }> | null;
  menu_variants?:
    | Array<{ name?: string; serving_label?: string | null; price?: number }>
    | { name?: string; serving_label?: string | null; price?: number }
    | null;
};

function variantsOf(item: RawItem) {
  const raw = item.menu_variants;
  return (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
}

/**
 * The queue the adviser asked for. The buttons only decide the state — the
 * database's row-level guard is what makes sure nobody but an admin can move
 * an item through it, and rejecting also clears `is_active` so a stale cart
 * cannot still order the refused item.
 */
function ApprovalCard({ item, children }: { item: RawItem; children: React.ReactNode }) {
  const category = one(item.categories);
  const variants = variantsOf(item);

  return (
    <Card className="border shadow-none">
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-52">
          <MenuImage name={item.name} src={item.image_url} />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>{item.name}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {category?.name ?? "Uncategorized"} · submitted {when.format(new Date(item.created_at))}
            {item.decided_at && <> · decided {when.format(new Date(item.decided_at))}</>}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{item.description || "No description provided."}</p>
          {variants.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {variants.map((variant) => (
                <li className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800" key={`${item.id}-${variant.name}`}>
                  {variant.name}
                  {variant.serving_label && <> · {variant.serving_label}</>}
                  {" · "}
                  {currency.format(Number(variant.price ?? 0))}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function decisionForm(itemId: string, decision: "approved" | "rejected", label: string, variant: "default" | "outline" | "destructive") {
  return (
    <Form action={setMenuApproval} key={`${itemId}-${decision}`}>
      <input name="decision" type="hidden" value={decision} />
      <input name="menuItemId" type="hidden" value={itemId} />
      <Button size="sm" type="submit" variant={variant}>{label}</Button>
    </Form>
  );
}

export default async function MenuApprovalsPage({ searchParams }: MenuApprovalsPageProps) {
  await requireRole(["admin"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();

  const select = "id, name, description, image_url, created_at, decided_at, categories(name), menu_variants(name, serving_label, price)";
  const [{ data: pendingRows }, { data: rejectedRows }, { count: approvedCount }] = await Promise.all([
    supabase.from("menu_items").select(select).eq("approval_status", "pending").order("created_at", { ascending: true }),
    supabase.from("menu_items").select(select).eq("approval_status", "rejected").order("decided_at", { ascending: false }),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
  ]);

  const pending = (pendingRows ?? []) as RawItem[];
  const rejected = (rejectedRows ?? []) as RawItem[];

  const notice =
    updated === "approved"
      ? { ok: true, text: "Item approved — it is on the customer menu now." }
      : updated === "rejected"
        ? { ok: true, text: "Item rejected — it is off the customer menu and can no longer be ordered." }
        : error === "admins-only"
          ? { ok: false, text: "Only an admin can approve menu items." }
          : error
            ? { ok: false, text: "That decision could not be saved." }
            : null;

  return (
    <main className="min-h-screen w-full px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Menu approvals</h1>
          <p className="mt-2 text-muted-foreground">
            Staff submissions stay off the customer menu until an admin decides here.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="self-center text-sm text-muted-foreground">{approvedCount ?? 0} approved</span>
          <Button render={<Link href="/admin" />} variant="outline">Administration</Button>
        </div>
      </header>

      {notice && (
        <p className={`mb-6 rounded-2xl px-4 py-3 text-sm ${notice.ok ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-destructive dark:bg-red-950 dark:text-red-300"}`}>
          {notice.text}
        </p>
      )}

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Awaiting approval</h2>
          <span className="text-sm text-muted-foreground">{pending.length} pending</span>
        </div>
        {pending.length ? (
          <div className="grid gap-5">
            {pending.map((item) => (
              <ApprovalCard item={item} key={item.id}>
                {decisionForm(item.id, "approved", "Approve", "default")}
                {decisionForm(item.id, "rejected", "Reject", "destructive")}
              </ApprovalCard>
            ))}
          </div>
        ) : (
          <Card className="border shadow-none">
            <CardHeader><CardTitle>Nothing waiting</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground">
              Every menu item the staff submits has been decided on.
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Rejected</h2>
          <span className="text-sm text-muted-foreground">{rejected.length} off the menu</span>
        </div>
        {rejected.length ? (
          <div className="grid gap-5">
            {rejected.map((item) => (
              <ApprovalCard item={item} key={item.id}>
                {decisionForm(item.id, "approved", "Approve after changes", "outline")}
              </ApprovalCard>
            ))}
          </div>
        ) : (
          <Card className="border shadow-none">
            <CardHeader><CardTitle>Nothing rejected</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground">No item has been turned down.</CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
