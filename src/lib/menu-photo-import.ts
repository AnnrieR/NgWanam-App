import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approvedPhotoMenu, normalizeMenuName, type PhotoMenuItem } from "./approved-menu-photo";

type Client = Pick<SupabaseClient, "from">;
export type ImportItem = { id: string; name: string; category_id: string; description: string | null; is_active: boolean; approval_status: string };
export type ImportCategory = { id: string; name: string };
export type ImportOutcome = { name: string; status: "created" | "skipped" | "failed"; message: string };
export const importPendingDescription = "[Import in progress: approved May 2026 menu photo, page 1]";
const completedDescription = "From the approved May 2026 Ng-Wanam menu.";

// Fixed IDs make repeated/concurrent imports insert-only, not stock-reset upserts.
export function photoImportId(key: string) {
  const hash = createHash("sha256").update(`ngwanam-approved-menu-may2026-page1:${key}`).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export async function readImportItems(client: Client): Promise<ImportItem[]> {
  const rows: ImportItem[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await client.from("menu_items")
      .select("id,name,category_id,description,is_active,approval_status").order("id").range(offset,offset+499);
    if (error || !data) throw new Error("Menu comparison is unavailable. No import can start without a complete comparison.");
    rows.push(...data as ImportItem[]);
    if (data.length < 500) return rows;
  }
  throw new Error("Menu comparison exceeds the safe import limit. No import started.");
}

export function importFingerprint(items: ImportItem[]) {
  return createHash("sha256").update(JSON.stringify([...items].sort((a,b) => a.id.localeCompare(b.id)))).digest("hex");
}

export function planPhotoImport(items: ImportItem[]) {
  const exactPhotoNames = new Set(approvedPhotoMenu.flatMap(source => [source.name,...source.aliases ?? []]).map(normalizeMenuName));
  return approvedPhotoMenu.map(source => {
    const names = new Set([source.name,...source.aliases ?? []].map(normalizeMenuName));
    const matches = items.filter(row => names.has(normalizeMenuName(row.name)));
    const own = items.find(row => row.id === photoImportId(source.key));
    const resumable = own?.description === importPendingDescription && !own.is_active &&
      own.name === source.name && matches.length === 1 && matches[0].id === own.id;
    const normalized = normalizeMenuName(source.name);
    const similar = items.filter(row => {
      const name = normalizeMenuName(row.name);
      return !exactPhotoNames.has(name) && name.split(" ").length >= 2 &&
        (normalized.startsWith(`${name} `) || name.startsWith(`${normalized} `));
    });
    return { source, status: resumable ? "resume" as const : matches.length || own ? "skip" as const : "new" as const, matches, own, similar };
  });
}

export async function importApprovedPhoto(client: Client, groups: Record<"pancit" | "chicken",string>, expectedFingerprint: string, selectedKeys: string[]): Promise<ImportOutcome[]> {
  if (!selectedKeys.length || selectedKeys.length > approvedPhotoMenu.length || selectedKeys.some(key => !approvedPhotoMenu.some(source => source.key === key))) throw new Error("Select at least one approved photo item to import.");
  const items = await readImportItems(client);
  if (importFingerprint(items) !== expectedFingerprint) throw new Error("Menu changed since preview. Refresh this page and review the new comparison before importing.");
  const { data: categories, error: categoryError } = await client.from("categories").select("id,name").in("id", [...new Set(Object.values(groups))]);
  if (categoryError || !categories || !Object.values(groups).every(id => categories.some(row => row.id === id))) throw new Error("Choose valid existing categories for Pancit and Chicken.");
  const outcomes: ImportOutcome[] = [];
  for (const plan of planPhotoImport(items)) {
    const source = plan.source;
    if (!selectedKeys.includes(source.key)) {
      outcomes.push({ name: source.name, status: "skipped", message: "Not selected. No changes made." });
      continue;
    }
    if (plan.status === "skip") {
      outcomes.push({ name: source.name, status: "skipped", message: "Existing item preserved, including prices, servings, photos and stock." });
      continue;
    }
    try {
      await importOneItem(client, source, plan.own?.category_id ?? groups[source.group]);
      outcomes.push({ name: source.name, status: "created", message: "Imported. New stock rows start at 15; any already-created stock rows were preserved." });
    } catch {
      outcomes.push({ name: source.name, status: "failed", message: "Not confirmed complete. Refresh the comparison before retrying. An incomplete import stays inactive; existing stock is never reset." });
      // Stop after the first failure, rather than creating many partial entries.
      break;
    }
  }
  return outcomes;
}

async function importOneItem(client: Client, source: PhotoMenuItem, categoryId: string) {
  const itemId = photoImportId(source.key);
  const inserted = await client.from("menu_items").upsert({ id: itemId, category_id: categoryId, name: source.name,
    description: importPendingDescription, image_url: null, is_best_seller: !!source.bestSeller,
    requires_preorder: false, is_active: false, approval_status: "approved",
  }, { onConflict: "id", ignoreDuplicates: true });
  if (inserted.error) throw inserted.error;
  const { data: current, error } = await client.from("menu_items").select("id,name,description,is_active,category_id").eq("id",itemId).single();
  if (error || !current || current.name !== source.name || current.category_id !== categoryId) throw new Error("Imported item changed. Review manually.");
  // Another confirmed importer may already have finished this same item.
  if (current.description === completedDescription) return;
  if (current.description !== importPendingDescription || current.is_active) throw new Error("Imported item changed. Review manually.");
  for (const [index,serving] of source.servings.entries()) {
    const variantId = photoImportId(`${source.key}:serving:${index}`);
    const variant = await client.from("menu_variants").upsert({ id: variantId, menu_item_id: itemId,
      name: serving.name, serving_label: serving.label, price: serving.price, is_active: true,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (variant.error) throw variant.error;
    // Do not overwrite edits or reactivate a serving retired since a partial import.
    const existing = await client.from("menu_variants").select("id,menu_item_id,name,serving_label,price,is_active").eq("id",variantId).single();
    if (existing.error || !existing.data || existing.data.menu_item_id !== itemId || existing.data.name !== serving.name ||
      existing.data.serving_label !== serving.label || Number(existing.data.price) !== serving.price || !existing.data.is_active) throw new Error("Serving changed. Review manually.");
    const inventory = await client.from("inventory").upsert({ id: photoImportId(`${source.key}:stock:${index}`),
      menu_variant_id: variantId, current_stock: 15, reserved_stock: 0, minimum_stock: 0,
    }, { onConflict: "menu_variant_id", ignoreDuplicates: true });
    if (inventory.error) throw inventory.error;
  }
  // Publish only a fully assembled item. This never updates existing catalog items.
  const published = await client.from("menu_items").update({ is_active: true, description: completedDescription })
    .eq("id",itemId).eq("description",importPendingDescription).eq("is_active",false).select("id").maybeSingle();
  if (published.error) throw published.error;
  if (!published.data) {
    const recheck = await client.from("menu_items").select("description").eq("id",itemId).single();
    if (recheck.error || recheck.data?.description !== completedDescription) throw new Error("Publication not confirmed.");
  }
}
