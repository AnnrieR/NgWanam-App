import assets from "./menu-photo-assets.json";

export const menuPhotoAssets = assets;
export type MenuPhotoAsset = (typeof assets)[number];
export type PhotoMenuRow = { id: string; name: string; image_url: string | null; approval_status: string };
export type PhotoMatch = {
  key: string; source: string; note: string; itemId?: string; itemName?: string;
  status: "ready" | "existing" | "missing" | "ambiguous" | "review";
};

export function normalizePhotoMenuName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bw\s*\//g, " with ").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
    .replace(/\bgreen peas\b/g, "greenpeas").replace(/\b(pm|rm) (\d+)\b/g, "$1$2");
}

export function matchMenuPhotos(rows: PhotoMenuRow[], photos: MenuPhotoAsset[] = assets): PhotoMatch[] {
  const matches: PhotoMatch[] = photos.map(photo => {
    const base = { key: photo.key, source: photo.source, note: photo.note };
    if (!photo.names.length) return { ...base, status: "review" };
    const names = new Set(photo.names.map(normalizePhotoMenuName));
    // Duplicates remain ambiguous even if only one has approval/photo attached.
    const candidates = rows.filter(row => names.has(normalizePhotoMenuName(row.name)));
    if (candidates.length === 0) return { ...base, status: "missing", note: "No exact existing menu item. No item will be created." };
    if (candidates.length !== 1) return { ...base, status: "ambiguous", note: "Multiple items match. Nothing will be changed." };
    const item = candidates[0];
    if (item.approval_status !== "approved") return { ...base, status: "review", note: "Item is not approved. Approval will not be changed." };
    return { ...base, itemId: item.id, itemName: item.name, status: item.image_url ? "existing" : "ready" };
  });
  // Never let two photos compete for one menu item's single image_url field.
  const targets = new Map<string, number>();
  for (const match of matches) if (match.itemId) targets.set(match.itemId, (targets.get(match.itemId) ?? 0) + 1);
  return matches.map(match => match.itemId && targets.get(match.itemId)! > 1
    ? { ...match, status: "ambiguous", note: "More than one source photo targets this item. Choose its intended photo first." }
    : match);
}
