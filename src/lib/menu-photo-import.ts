import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { approvedPhotoMenu, normalizeMenuName, type MenuGroup, type PhotoServing } from "./approved-menu-photo";

type Client = Pick<SupabaseClient, "from">;
export type ImportVariant = { id: string; menu_item_id: string; name: string; serving_label: string; price: number; is_active: boolean; inventory: { id: string }[] | { id: string } | null };
export type ImportItem = { id: string; name: string; category_id: string; description: string | null; is_active: boolean; approval_status: string; requires_preorder: boolean; menu_variants: ImportVariant[] };
export type ImportCategory = { id: string; name: string };
export type ImportOutcome = { name: string; status: "created" | "skipped" | "failed"; message: string };
export type ImportGroups = Partial<Record<MenuGroup, string>>;
export const importPendingDescription = "[Import in progress: approved May 2026 menu photo, page 1]";
const completedDescription = "From the approved Ng-Wanam menu photos.";
const catalogNames = new Map(approvedPhotoMenu.map(source => [source.key,new Set([source.name,...source.aliases ?? []].map(normalizeMenuName))]));
const knownCatalogNames = new Set([...catalogNames.values()].flatMap(names => [...names]));

// Keep the original namespace and serving indexes: page-1 retries remain safe.
export function photoImportId(key: string) {
  const hash = createHash("sha256").update(`ngwanam-approved-menu-may2026-page1:${key}`).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export async function readImportItems(client: Client): Promise<ImportItem[]> {
  const rows: ImportItem[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await client.from("menu_items")
      .select("id,name,category_id,description,is_active,approval_status,requires_preorder,menu_variants(id,menu_item_id,name,serving_label,price,is_active,inventory(id))").order("id").range(offset,offset+499);
    if (error || !data) throw new Error("Menu comparison is unavailable. No bulk add can start without a complete comparison.");
    rows.push(...data as ImportItem[]);
    if (data.length < 500) return rows;
  }
  throw new Error("Menu comparison exceeds the safe limit. No bulk add started.");
}

export function importFingerprint(items: ImportItem[]) {
  // Include serving edits and inventory-row existence, not changing stock balances.
  const snapshot = [...items].sort((a,b) => a.id.localeCompare(b.id)).map(item => ({ ...item,
    menu_variants: [...item.menu_variants].sort((a,b) => a.id.localeCompare(b.id)).map(variant => ({ ...variant,
      inventory: (Array.isArray(variant.inventory) ? variant.inventory : variant.inventory ? [variant.inventory] : []).sort((a,b) => a.id.localeCompare(b.id)),
    })),
  }));
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function servingIdentity(name: string, label: string) {
  const normalize = (text: string) => normalizeMenuName(text).replace(/\b(?:pcs|pc|pieces|piece)\b/g,"pieces").replace(/\b(?:kilograms?|kilos?|kgs?)\b/g,"kilo");
  const text = `${normalize(name)} ${normalize(label)}`;
  const people = `${label} | ${name}`.match(/\bgood\s+for\s+(\d+)(?:\s*[-–—]\s*(\d+)|\s+to\s+(\d+))?\b/i);
  const pieces = text.match(/\b(\d+)\s*pieces\b/);
  const weight = text.match(/\b(\d+)\s*kilo\b/)?.[1] ?? (/\bper kilo\b/.test(text) ? "1" : null);
  // Labels are authoritative; a default serving_min=1 is not evidence of size.
  return { people: people ? `${people[1]}:${people[2] ?? people[3] ?? people[1]}` : null,
    pieces: pieces?.[1] ?? null, weight, name: normalize(name), label: normalize(label) };
}

export function sameServing(source: PhotoServing, existing: Pick<ImportVariant,"name" | "serving_label">) {
  const a = servingIdentity(source.name,source.label);
  const b = servingIdentity(existing.name,existing.serving_label);
  if (a.people && b.people && a.people !== b.people) return false;
  if (a.pieces && b.pieces && a.pieces !== b.pieces) return false;
  if (a.weight && b.weight && a.weight !== b.weight) return false;
  if (a.weight && b.weight) return true;
  if (a.pieces && b.pieces) return true;
  if (a.people && b.people) return true;
  return a.name === b.name || a.label === b.label;
}

function inventoryExists(variant: ImportVariant) {
  return Array.isArray(variant.inventory) ? variant.inventory.length > 0 : !!variant.inventory;
}

export function planPhotoImport(items: ImportItem[], onlyKey?: string) {
  const normalizedItems = items.map(row => ({ row, name: normalizeMenuName(row.name) }));
  return (onlyKey ? approvedPhotoMenu.filter(source => source.key === onlyKey) : approvedPhotoMenu).map(source => {
    const names = catalogNames.get(source.key)!;
    const matches = normalizedItems.filter(({ name }) => names.has(name)).map(({ row }) => row);
    const own = items.find(row => row.id === photoImportId(source.key));
    const exact = matches.filter(row => normalizeMenuName(row.name) === normalizeMenuName(source.name));
    const target = matches.length === 1 ? matches[0] : exact.length === 1 ? exact[0] : undefined;
    const pending = target?.description === importPendingDescription && !target.is_active;
    const similar = normalizedItems.filter(({ row, name }) => !knownCatalogNames.has(name) && (() => {
      const normalized = normalizeMenuName(source.name);
      const base = normalized.replace(/ chicken lahok$/,"");
      const alternative = row.name.includes("/") && row.name.toLowerCase().includes("lahok") &&
        normalized.includes("chicken") === name.includes("chicken") &&
        name.includes(base);
      return alternative || (name.split(" ").length >= 2 && (normalized.startsWith(`${name} `) || name.startsWith(`${normalized} `)));
    })()).map(({ row }) => row);
    const servings = source.servings.map((serving,index) => {
      const found = matches.flatMap(item => item.menu_variants).filter(variant => sameServing(serving,variant));
      const generatedId = photoImportId(`${source.key}:serving:${index}`);
      const repair = found.length === 1 && found[0].id === generatedId && !inventoryExists(found[0]) &&
        found[0].is_active && Number(found[0].price) === serving.price && found[0].name === serving.name && found[0].serving_label === serving.label;
      return { serving, index, found, status: repair ? "repair" as const : found.length ? "existing" as const : "missing" as const };
    });
    const sourceIsUnspecified = source.servings.every(serving => {
      const identity = servingIdentity(serving.name,serving.label);
      return !identity.people && !identity.pieces && !identity.weight;
    });
    const unknown = matches.flatMap(item => item.menu_variants).filter(variant => {
      const identity = servingIdentity(variant.name,variant.serving_label);
      return !source.servings.some(serving => sameServing(serving,variant)) &&
        (sourceIsUnspecified || (!identity.people && !identity.pieces && !identity.weight));
    });
    const missing = servings.filter(row => row.status !== "existing");
    const changedIncomplete = servings.some(row => row.found.some(variant => variant.id === photoImportId(`${source.key}:serving:${row.index}`) &&
      !inventoryExists(variant) && row.status !== "repair"));
    const blocked = changedIncomplete || (!!missing.length && ((matches.length > 0 && !target) || (!!own && !matches.includes(own)) || unknown.length > 0 ||
      (!!target && ((!pending && (!target.is_active || target.approval_status !== "approved")) ||
        (typeof source.requiresPreorder === "boolean" && source.requiresPreorder !== !!target.requires_preorder)))));
    return { source, matches, target, similar, servings, pending, blocked,
      status: blocked ? "review" as const : !missing.length && !pending ? "skip" as const : target ? "extend" as const : "new" as const };
  });
}

export async function importApprovedPhoto(client: Client, groups: ImportGroups, expectedFingerprint: string, selectedKeys: string[]): Promise<ImportOutcome[]> {
  if (!selectedKeys.length || selectedKeys.length > approvedPhotoMenu.length || selectedKeys.some(key => !approvedPhotoMenu.some(source => source.key === key))) throw new Error("Select at least one encoded menu item to bulk add.");
  const items = await readImportItems(client);
  if (importFingerprint(items) !== expectedFingerprint) throw new Error("Menu changed since preview. Refresh this page and review the new comparison before bulk adding.");
  const plans = planPhotoImport(items);
  // Validate only category assignments needed by selected, genuinely new items.
  const needed = plans.filter(plan => selectedKeys.includes(plan.source.key) && plan.status === "new").map(plan => groups[plan.source.group]);
  const ids = [...new Set(needed.filter((id): id is string => !!id))];
  if (needed.some(id => !id)) throw new Error("Choose valid existing categories for the selected new items.");
  if (ids.length) {
    const { data, error } = await client.from("categories").select("id,name").in("id",ids);
    if (error || !data || !ids.every(id => data.some(row => row.id === id))) throw new Error("Choose valid existing categories for the selected new items.");
  }
  const outcomes: ImportOutcome[] = [];
  for (const plan of plans) {
    const name = plan.source.name;
    if (!selectedKeys.includes(plan.source.key) || plan.status === "skip" || plan.blocked) {
      outcomes.push({ name, status: "skipped", message: plan.blocked ? "Review required: ambiguous item/serving, inactive/unapproved item or conflicting pre-order setting. Nothing changed." : plan.status === "skip" ? "All listed servings already exist. Prices, inactive/retired servings and stocks preserved." : "Not selected. Nothing changed." });
      continue;
    }
    try {
      await importOneItem(client,plan,groups[plan.source.group]);
      outcomes.push({ name, status: "created", message: "Missing servings saved. Newly created stock rows start at 15; existing prices and stock were not changed." });
    } catch (error) {
      // Diagnostics contain no raw database/provider text or user data.
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[a-zA-Z0-9_]{1,60}$/.test(error.code) ? error.code : "unknown";
      console.error("[menu-bulk-add]", { stage: "save-item", code });
      outcomes.push({ name, status: "failed", message: `Bulk add stopped; completion is not confirmed. Refresh before retrying. Existing stock is never reset. Reference: menu-bulk-add/${code}` });
      break;
    }
  }
  return outcomes;
}

async function importOneItem(client: Client, plan: ReturnType<typeof planPhotoImport>[number], categoryId?: string) {
  const { source } = plan;
  const itemId = plan.target?.id ?? photoImportId(source.key);
  if (!plan.target) {
    const inserted = await client.from("menu_items").upsert({ id: itemId, category_id: categoryId, name: source.name,
      description: importPendingDescription, image_url: null, is_best_seller: !!source.bestSeller,
      requires_preorder: !!source.requiresPreorder, is_active: false, approval_status: "approved",
    }, { onConflict: "id", ignoreDuplicates: true });
    if (inserted.error) throw inserted.error;
  }
  // Refresh after each write sequence: parallel importers must see the same item.
  const currentItems = await readImportItems(client);
  const currentPlan = planPhotoImport(currentItems,source.key)[0];
  const current = currentItems.find(item => item.id === itemId);
  if (!current || currentPlan.blocked || currentPlan.target?.id !== itemId) throw new Error("Item changed. Refresh before retrying.");
  for (const row of currentPlan.servings) {
    if (row.status === "existing") continue;
    const variantId = photoImportId(`${source.key}:serving:${row.index}`);
    if (row.status === "missing") {
      const variant = await client.from("menu_variants").upsert({ id: variantId, menu_item_id: itemId,
        name: row.serving.name, serving_label: row.serving.label, price: row.serving.price, is_active: true,
      }, { onConflict: "id", ignoreDuplicates: true });
      if (variant.error) throw variant.error;
    }
    const check = await client.from("menu_variants").select("id,menu_item_id,name,serving_label,price,is_active").eq("id",variantId).single();
    if (check.error || !check.data || check.data.menu_item_id !== itemId || check.data.name !== row.serving.name ||
      check.data.serving_label !== row.serving.label || Number(check.data.price) !== row.serving.price || !check.data.is_active) throw new Error("Serving changed. Review manually.");
    const stock = await client.from("inventory").upsert({ id: photoImportId(`${source.key}:stock:${row.index}`),
      menu_variant_id: variantId, current_stock: 15, reserved_stock: 0, minimum_stock: 0,
    }, { onConflict: "menu_variant_id", ignoreDuplicates: true });
    if (stock.error) throw stock.error;
  }
  // Only our newly created/incomplete item is ever updated, never an existing item.
  if (current.description === importPendingDescription && !current.is_active) {
    const finalItems = await readImportItems(client);
    const final = planPhotoImport(finalItems,source.key)[0];
    if (final.blocked || final.servings.some(row => row.status !== "existing")) throw new Error("Incomplete item remains inactive.");
    const description = source.description ? `${completedDescription} ${source.description}` : completedDescription;
    const published = await client.from("menu_items").update({ is_active: true, description })
      .eq("id",itemId).eq("description",importPendingDescription).eq("is_active",false).select("id").maybeSingle();
    if (published.error) throw published.error;
    if (!published.data) {
      const recheck = await client.from("menu_items").select("description").eq("id",itemId).single();
      if (recheck.error || recheck.data?.description !== description) throw new Error("Publication not confirmed.");
    }
  }
}
