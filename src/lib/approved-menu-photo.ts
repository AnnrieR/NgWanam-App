export type PhotoServing = { name: string; label: string; price: number };
export type PhotoMenuItem = { key: string; name: string; group: "pancit" | "chicken"; bestSeller?: boolean; aliases?: string[]; servings: PhotoServing[] };
const smallLarge = (small: number, large?: number): PhotoServing[] => [
  { name: "Good for 1", label: "Good for 1", price: small },
  ...(large === undefined ? [] : [{ name: "Good for 3", label: "Good for 3", price: large }]),
];
const chicken = (half: number, whole: number): PhotoServing[] => [
  { name: "Half", label: "Good for 3", price: half },
  { name: "Whole", label: "Good for 6", price: whole },
];

// Transcribed from the user's approved May 2026 menu photo. No OCR/provider call.
export const approvedPhotoMenu: PhotoMenuItem[] = [
  { key: "miki", name: "Miki Guisado", group: "pancit", bestSeller: true, aliases: ["Miki Guisado (NG-WANAM Best Seller)"], servings: smallLarge(110,170) },
  { key: "canton", name: "Canton", group: "pancit", servings: smallLarge(130,190) },
  { key: "canton-bihon", name: "Canton-Bihon", group: "pancit", servings: smallLarge(130,190) },
  { key: "bihon", name: "Bihon", group: "pancit", servings: smallLarge(130,190) },
  { key: "miki-bihon", name: "Miki Bihon", group: "pancit", servings: smallLarge(130,190) },
  { key: "miki-chicken", name: "Miki Guisado (Chicken Lahok)", group: "pancit", aliases: ["Miki Guisado Chicken Lahok", "Miki Guisado (Chicken)"], servings: smallLarge(140,200) },
  { key: "lechon-miki", name: "Lechon Guisado (Miki)", group: "pancit", aliases: ["Lechon Guisado Miki"], servings: smallLarge(170) },
  { key: "lomi", name: "Chinese Lomi", group: "pancit", servings: smallLarge(110,160) },
  { key: "pork-mami", name: "Pork Mami", group: "pancit", servings: smallLarge(110) },
  { key: "chicken-mami", name: "Chicken Mami", group: "pancit", servings: smallLarge(110) },
  { key: "spaghetti", name: "Pinoy Style Spaghetti w/ Garlic Bread", group: "pancit", servings: smallLarge(170) },
  { key: "carbonara", name: "Classic Carbonara w/ Garlic Bread", group: "pancit", servings: smallLarge(215) },
  { key: "fried-chicken", name: "Fried Chicken", group: "chicken", bestSeller: true, aliases: ["Fried Chicken (Best Seller)"], servings: chicken(225,450) },
  { key: "asado", name: "Chicken Asado", group: "chicken", servings: chicken(225,450) },
  { key: "chop", name: "Chop Chicken", group: "chicken", servings: chicken(275,550) },
  { key: "boneless-ham", name: "Boneless Chicken w/ Ham", group: "chicken", servings: chicken(275,550) },
  { key: "breaded", name: "Breaded Chicken", group: "chicken", servings: chicken(275,550) },
  { key: "hongkong", name: "Fried Chicken w/ Vegetables - HongKong Style", group: "chicken", aliases: ["Fried Chicken w/ Vegetables (HongKong Style)", "Fried Chicken with Vegetables Hong Kong Style"], servings: chicken(300,600) },
  { key: "sweet-sour", name: "Sweet & Sour Chicken", group: "chicken", servings: chicken(300,600) },
  { key: "lumpia", name: "Chicken Lumpia Shanghai", group: "chicken", aliases: ["Chicken Lumpia Shanghai - 15pcs", "Chicken Lumpia Shanghai 15 pcs"], servings: [{ name: "15 pcs", label: "15 pieces", price: 180 }] },
];

export function normalizeMenuName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bw\s*\//g, " with ").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
