export type PhotoServing = { name: string; label: string; price: number };
export const menuGroups = {
  pancit: "Pancit / noodles / pasta", chicken: "Chicken", pork: "Pork", seafood: "Seafood",
  vegetable: "Vegetable", rice: "Rice", soup: "Soup", appetizer: "Appetizer",
  drinks: "Drinks", dessert: "Dessert", sandwiches: "Sandwiches", others: "Others / extras", family: "Family Sizes / bilao",
} as const;
export type MenuGroup = keyof typeof menuGroups;
export type PhotoMenuItem = { key: string; name: string; group: MenuGroup; bestSeller?: boolean; aliases?: string[]; servings: PhotoServing[] };
const serving = (count: number, price: number): PhotoServing => ({ name: `Good for ${count}`, label: `Good for ${count}`, price });
const regular = (price: number): PhotoServing[] => [{ name: "Regular", label: "Regular serving", price }];
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
  { key: "miki", name: "Miki Guisado", group: "pancit", bestSeller: true, aliases: ["Miki Guisado (NG-WANAM Best Seller)", "Miki Guisado - Pork Lahok", "Miki Guisado (Pork)"], servings: [...smallLarge(110,170), serving(8,550), serving(12,700)] },
  { key: "canton", name: "Canton", group: "pancit", aliases: ["Canton - Pork Lahok"], servings: [...smallLarge(130,190), serving(8,600), serving(12,800)] },
  { key: "canton-bihon", name: "Canton-Bihon", group: "pancit", aliases: ["Canton-Bihon - Pork Lahok"], servings: [...smallLarge(130,190), serving(8,600), serving(12,800)] },
  { key: "bihon", name: "Bihon", group: "pancit", aliases: ["Bihon - Pork Lahok"], servings: [...smallLarge(130,190), serving(8,600), serving(12,800)] },
  { key: "miki-bihon", name: "Miki Bihon", group: "pancit", aliases: ["Miki-Bihon - Pork Lahok"], servings: [...smallLarge(130,190), serving(8,600), serving(12,800)] },
  { key: "miki-chicken", name: "Miki Guisado (Chicken Lahok)", group: "pancit", bestSeller: true, aliases: ["Miki Guisado Chicken Lahok", "Miki Guisado (Chicken)"], servings: [...smallLarge(140,200), serving(8,600), serving(12,750)] },
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
  // Photo 2: Pork and Seafood. Do not infer unavailable sizes or zero prices.
  { key: "pork-lumpia", name: "Lumpia Shanghai", group: "pork", bestSeller: true, aliases: ["Lumpia Shanghai 20pcs", "Lumpia Shanghai (20 pcs)"], servings: [{ name: "20 pieces", label: "Good for 4 (20 pieces)", price: 170 }] },
  ...([
    ["meatballs", "Sweet & Sour Meatballs", 170], ["pork-liver-peas", "Pork Liver w/ Greenpeas", 170],
    ["pork-liver-steak", "Pork Liver Steak", 180], ["halo-guisado", "Halo Guisado", 200], ["halo-prito", "Halo Prito", 200],
    ["lechon-kawali", "Lechon Kawali", 230], ["lechon-vegetables", "Lechon w/ Vegetables", 250],
    ["sweet-sour-pork", "Sweet & Sour Pork", 230], ["pork-steak", "Pork Steak", 230],
    ["pork-asado", "Pork Asado", 250], ["pork-sisig", "Pork Sisig", 250], ["embutido", "Embutido", 200],
  ] as const).map(([key,name,price]) => ({ key, name, group: "pork" as const, servings: [serving(2,price)] })),
  ...([
    ["ball-n-ball", "Ball n Ball", 350], ["crispy-pata", "Crispy Pata", 700], ["pata-tim", "Pata Tim Special", 870],
  ] as const).map(([key,name,price]) => ({ key, name, group: "pork" as const, servings: [serving(5,price)] })),
  ...([
    ["pusit-guisado", "Chinese Style Pusit Guisado", 230], ["calamares", "Fried Calamares", 230],
    ["fish-fillet", "Sweet and Sour Fish Fillet", 250], ["fish-chips", "Fish & Chips", 250],
    ["camaron", "Camaron Rebusado", 230], ["fried-shrimp", "Fried Shrimp w/ Sweet & Sour Sauce", 230],
    ["sinigang-hipon", "Sinigang na Hipon", 230], ["shrimp-lumpia", "Shrimp Lumpia", 250],
  ] as const).map(([key,name,price]) => ({ key, name, group: "seafood" as const, servings: [serving(2,price)] })),
  // Photo 3: Vegetables, Rice and Soup.
  ...([
    ["pork-chopsuey", "Pork Chopsuey", 200, 800], ["beef-chopsuey", "Beef Chopsuey", 220, 900],
    ["chicken-chopsuey", "Chicken Chopsuey", 220, 900], ["shrimp-chopsuey", "Shrimp Chopsuey", 220, 900],
  ] as const).map(([key,name,small,large]) => ({ key, name, group: "vegetable" as const, bestSeller: key === "pork-chopsuey", servings: [serving(2,small),serving(8,large)] })),
  ...([
    ["pork-ampalaya", "Pork Ampalaya", 200], ["shrimp-ampalaya", "Shrimp w/ Ampalaya", 220],
    ["beef-ampalaya", "Beef w/ Ampalaya", 220], ["shrimp-cauliflower", "Shrimp w/ Cauliflower", 220],
    ["pusit-vegetables", "Pusit w/ Vegetables", 240],
  ] as const).map(([key,name,price]) => ({ key, name, group: "vegetable" as const, servings: [serving(2,price)] })),
  { key: "plain-rice", name: "Plain Rice", group: "rice", servings: [serving(1,35)] },
  { key: "fried-rice", name: "Fried Rice", group: "rice", bestSeller: true, servings: [serving(1,120),serving(4,250)] },
  { key: "shrimp-rice", name: "Shrimp Fried Rice", group: "rice", servings: [serving(2,270)] },
  { key: "chicken-rice", name: "Chicken Fried Rice", group: "rice", servings: [serving(2,280)] },
  { key: "seafood-rice", name: "Seafood Fried Rice", group: "rice", servings: [serving(2,300)] },
  ...([
    ["hototay", "Hototay Soup"], ["nido", "Nido Soup"], ["chopsuey-soup", "Chopsuey Soup"],
    ["wonton", "Wonton Soup"], ["crab-corn", "Crab and Corn"],
  ] as const).map(([key,name]) => ({ key, name, group: "soup" as const, aliases: key === "crab-corn" ? ["Crab and Corn Soup"] : [], servings: [serving(3,220)] })),
  // Photo 4: all orderable extras; corkage is intentionally excluded (fees, not stock).
  { key: "lumpia-gulay", name: "Fried Lumpia Gulay", group: "appetizer", servings: [
    { name: "4 pieces", label: "4 pieces", price: 150 }, { name: "10 pieces", label: "10 pieces", price: 360 }, { name: "15 pieces", label: "15 pieces", price: 540 },
  ] },
  { key: "bulaklak", name: "Chicharon Bulaklak", group: "appetizer", servings: regular(240) },
  { key: "tokwat-baboy", name: "Tokwa't Baboy", group: "appetizer", servings: regular(180) },
  ...([
    ["mismo", "Mismo Size", 30], ["softdrinks-15", "1.5L Softdrinks", 110], ["iced-tea", "Iced Tea Pitcher", 80],
    ["pineapple", "Pineapple Juice", 60], ["coffee", "Coffee", 30], ["water", "Bottled Water", 25],
  ] as const).map(([key,name,price]) => ({ key, name, group: "drinks" as const, aliases: key === "mismo" ? ["Mismo Size Softdrink"] : [], servings: regular(price) })),
  { key: "flan", name: "Leche Flan", group: "dessert", servings: regular(130) },
  ...([
    ["cheese-sandwich", "Cheese Sandwich", 70], ["egg-sandwich", "Egg Sandwich", 70], ["ham-sandwich", "Ham Sandwich", 70],
    ["chicken-sandwich", "Chicken Sandwich", 80], ["ham-cheese", "Ham & Cheese Sandwich", 80],
    ["ham-egg", "Ham & Egg Sandwich", 80], ["egg-cheese", "Egg & Cheese Sandwich", 80],
  ] as const).map(([key,name,price]) => ({ key, name, group: "sandwiches" as const, servings: regular(price) })),
  { key: "lumpia-sauce", name: "Extra Sauce Lumpia", group: "others", servings: [
    { name: "Small", label: "Small", price: 20 }, { name: "Large", label: "Large", price: 150 },
  ] },
  ...([
    ["sarsa-isda", "Sarsa ng Isda", 200], ["lechon-sauce", "Extra Lechon Sauce", 30],
    ["pepper", "White Pepper", 20], ["toyo", "Toyo", 10], ["chili", "Chili Garlic", 50],
    ["cutlery", "Sealed Spoon and Fork", 10], ["frozen-lumpia", "Frozen Hilaw Lumpia", 160], ["toyo-1l", "1L Toyo", 95],
  ] as const).map(([key,name,price]) => ({ key, name, group: "others" as const, servings: regular(price) })),
  // Photo 5: Pork family sizes are appended above to the same item, never duplicated.
  ...([
    ["miki-bihon-chicken", "Miki Bihon (Chicken Lahok)"], ["canton-bihon-chicken", "Canton-Bihon (Chicken Lahok)"],
    ["bihon-chicken", "Bihon (Chicken Lahok)"], ["canton-chicken", "Canton (Chicken Lahok)"],
  ] as const).map(([key,name]) => ({ key, name, group: "pancit" as const, aliases: [name.replace("(Chicken Lahok)", "- Chicken Lahok")], servings: [serving(8,650),serving(12,850)] })),
  { key: "lumpia-bilao", name: "Lumpia Shanghai Bilao", group: "family", servings: [
    { name: "100 pieces", label: "Good for 25 (100 pieces)", price: 950 }, { name: "200 pieces", label: "Good for 50 (200 pieces)", price: 1850 },
  ] },
  { key: "chicken-bilao", name: "Fried Chicken Bilao", group: "family", servings: [serving(15,1500),serving(30,3000)] },
];

export function normalizeMenuName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bw\s*\//g, " with ").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
    .replace(/\bhong kong\b/g,"hongkong").replace(/\bgreen peas\b/g,"greenpeas");
}
