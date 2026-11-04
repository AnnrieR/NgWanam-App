import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { approvedPhotoMenu } from "@/lib/approved-menu-photo";
import { importFingerprint, planPhotoImport, readImportItems, type ImportItem, type ImportCategory } from "@/lib/menu-photo-import";
import { PhotoImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function BulkAddMenuPage() {
  await requireRole(["admin"]);
  const client = await createClient();
  let loaded: { items: ImportItem[]; categories: ImportCategory[] } | undefined;
  try {
    const [items, categories] = await Promise.all([readImportItems(client), client.from("categories").select("id,name").order("sort_order")]);
    if (!categories.error && categories.data) loaded = { items, categories: categories.data };
  } catch { /* No writes without a complete comparison. */ }
  if (!loaded) return <main className="p-6"><Link href="/menu" className="underline">Back to Menu</Link><p role="alert" className="mt-4">Could not load the complete item/serving comparison. Bulk Add is disabled; this preview made no database writes.</p></main>;
  const { items, categories } = loaded;
  const plan = planPhotoImport(items);
  const servingCount = approvedPhotoMenu.reduce((sum,item) => sum+item.servings.length,0);
  return <main className="mx-auto grid max-w-6xl gap-6 px-5 py-8">
    <Link href="/menu" className="text-sm underline">Back to Menu</Link>
    <header><h1 className="text-3xl font-bold">Bulk Add</h1><p className="mt-3 text-sm text-muted-foreground">Temporary menu setup · Photos 1–5 · {approvedPhotoMenu.length} items · {servingCount} serving/price entries. No upload needed. Review first, then confirm.</p></header>
    <p className="rounded-xl border p-4 text-sm">Comparison checks item + pork/chicken lahok + serving size. Existing Good for 8 does not prevent adding missing Good for 12. Existing prices, photos, stocks and history are preserved. New serving stock: <strong>15 sellable servings</strong>, not 15 individual pieces. Corkage fees are excluded. Ambiguous, inactive and unapproved items require review; nothing is automatically reactivated or approved.</p>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm">
      <thead><tr className="border-b"><th className="p-3">Item / lahok</th><th className="p-3">Serving and photo price</th><th className="p-3">Live comparison</th></tr></thead>
      <tbody>{plan.map(row => <tr className="border-b align-top" key={row.source.key}>
        <td className="p-3 font-medium">{row.source.name}{row.source.bestSeller && <span className="block text-xs text-primary">Best seller</span>}</td>
        <td className="p-3"><ul className="grid gap-1">{row.servings.map(({ serving,found,status }) => <li key={serving.name}>
          {serving.name}{serving.name !== serving.label && ` · ${serving.label}`} · ₱{serving.price.toFixed(2)} — {status === "existing" ? `Keep existing${found.some(variant => Number(variant.price) !== serving.price) ? ' (different price preserved)' : ''}${found.some(variant => !variant.is_active) ? ' (inactive/retired preserved)' : ''}` : status === "repair" ? "Resume new stock setup" : "Missing serving"}
        </li>)}</ul></td>
        <td className="p-3">{row.status === "review" ? "Review required — not selectable" : row.status === "skip" ? "Complete — nothing to add" : row.status === "extend" ? `Add missing servings to ${row.target?.name}${row.pending ? ' (resume incomplete setup)' : ''}` : "New item"}
          {!!row.similar.length && <p className="mt-2 text-xs">Similar existing names: {row.similar.map(item => item.name).join(', ')}. Not selected by default.</p>}
        </td>
      </tr>)}</tbody>
    </table></div>
    <PhotoImportForm categories={categories} fingerprint={importFingerprint(items)} choices={plan.map(row => ({ key: row.source.key, name: row.source.name,
      disabled: row.status === 'skip' || row.blocked, similar: row.similar.map(item => item.name), newGroup: row.status === 'new' ? row.source.group : undefined,
    }))} />
  </main>;
}
