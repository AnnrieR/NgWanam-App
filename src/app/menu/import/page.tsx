import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { importFingerprint, planPhotoImport, readImportItems, type ImportItem, type ImportCategory } from "@/lib/menu-photo-import";
import { PhotoImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function MenuPhotoImportPage() {
  await requireRole(["admin"]);
  const client = await createClient();
  let loaded: { items: ImportItem[]; categories: ImportCategory[] } | undefined;
  try {
    const [items, categories] = await Promise.all([
      readImportItems(client), client.from("categories").select("id,name").order("sort_order"),
    ]);
    if (categories.error || !categories.data) throw new Error("Category comparison unavailable.");
    loaded = { items, categories: categories.data };
  } catch {
    // Fail closed if the live comparison is incomplete.
  }
  if (!loaded) return <main className="p-6"><Link href="/menu" className="underline">Back to Menu</Link><p role="alert" className="mt-4">Could not load a complete live comparison. Import is disabled. Check the database connection and refresh; no import writes were made by this preview.</p></main>;
  const { items, categories } = loaded;
    const plan = planPhotoImport(items);
    const available = plan.some(row => row.status !== "skip") && categories.length > 0;
    return <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8">
      <Link href="/menu" className="text-sm underline">Back to Menu</Link>
      <header><h1 className="text-3xl font-bold">Import approved photo menu</h1>
        <p className="mt-3 text-sm text-muted-foreground">May 2026 photo, page 1 · 20 items · 34 servings. Read-only preview until you confirm Import. Missing whole items only; existing items are skipped even if their prices or servings differ.</p></header>
      <p className="rounded-xl border p-4 text-sm">Starting stock: <strong>15 per newly created serving</strong>. A 15-piece lumpia serving counts as one sellable serving. No existing stock is reset. No photos are fabricated or replaced. No siomai is included. Review similar existing names before proceeding; uncertain name matches are not guessed.</p>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-3">Item</th><th className="p-3">Photo servings / prices</th><th className="p-3">Live comparison</th></tr></thead>
        <tbody>{plan.map(({ source,status,matches,similar }) => <tr className="border-b" key={source.key}>
          <td className="p-3 font-medium">{source.name}{source.bestSeller && <span className="block text-xs text-primary">Best seller</span>}</td>
          <td className="p-3"><ul>{source.servings.map(serving => <li key={serving.name}>{serving.name} · {serving.label} · ₱{serving.price.toFixed(2)}</li>)}</ul></td>
          <td className="p-3">{status === "new" ? similar.length ? `Review similar: ${similar.map(row => row.name).join(', ')}` : "New item" : status === "resume" ? "Resume incomplete import (no stock reset)" : `Skip existing: ${matches.map(row => row.name).join(', ') || 'reserved import ID'}`}</td>
        </tr>)}</tbody>
      </table></div>
      {!available && <p role="status">Nothing to import, or no categories are configured. Existing items are never overwritten.</p>}
      <PhotoImportForm categories={categories} fingerprint={importFingerprint(items)} available={available} choices={plan.map(row => ({ key: row.source.key, name: row.source.name, disabled: row.status === 'skip', similar: row.similar.map(item => item.name) }))} />
    </main>;
}
