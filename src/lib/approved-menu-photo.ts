export type PhotoServing = { name: string; label: string; price: number };
export const menuGroups = {
  pancit: "Pancit / noodles / pasta", chicken: "Chicken", pork: "Pork", seafood: "Seafood",
  vegetable: "Vegetable", rice: "Rice", soup: "Soup", appetizer: "Appetizer",
  drinks: "Drinks", dessert: "Dessert", sandwiches: "Sandwiches", others: "Others / extras", family: "Family Sizes / bilao",
  party: "Party Trays - Pre-order",
} as const;
export type MenuGroup = keyof typeof menuGroups;
export type PhotoMenuItem = { key: string; name: string; group: MenuGroup; bestSeller?: boolean; aliases?: string[]; description?: string; requiresPreorder?: boolean; servings: PhotoServing[] };
const serving = (count: number, price: number): PhotoServing => ({ name: `Good for ${count}`, label: `Good for ${count}`, price });
const rangeServing = (min: number, max: number, price: number): PhotoServing => ({ name: `Good for ${min}–${max}`, label: `Good for ${min}–${max}`, price });
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
  { key: "spaghetti", name: "Pinoy Style Spaghetti w/ Garlic Bread", group: "pancit", aliases: ["Pinoy Style Spaghetti"], servings: [...smallLarge(170),rangeServing(6,8,1100)] },
  { key: "carbonara", name: "Classic Carbonara w/ Garlic Bread", group: "pancit", aliases: ["Classic Carbonara"], servings: [...smallLarge(215),rangeServing(6,8,1300)] },
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
  ] as const).map(([key,name,small,large]) => ({ key, name, group: "vegetable" as const, bestSeller: key === "pork-chopsuey",
    aliases: key === "shrimp-chopsuey" ? [] : [`${name} Family`],
    servings: [serving(2,small),serving(8,large),...(key === "shrimp-chopsuey" ? [] : [serving(15,key === "pork-chopsuey" ? 1700 : 2200)])],
  })),
  ...([
    ["pork-ampalaya", "Pork Ampalaya", 200], ["shrimp-ampalaya", "Shrimp w/ Ampalaya", 220],
    ["beef-ampalaya", "Beef w/ Ampalaya", 220], ["shrimp-cauliflower", "Shrimp w/ Cauliflower", 220],
    ["pusit-vegetables", "Pusit w/ Vegetables", 240],
  ] as const).map(([key,name,price]) => ({ key, name, group: "vegetable" as const, servings: [serving(2,price)] })),
  { key: "plain-rice", name: "Plain Rice", group: "rice", servings: [serving(1,35)] },
  { key: "fried-rice", name: "Fried Rice", group: "rice", bestSeller: true, aliases: ["Fried Rice Tray"], servings: [serving(1,120),serving(4,250),serving(8,800),serving(12,1100)] },
  { key: "shrimp-rice", name: "Shrimp Fried Rice", group: "rice", servings: [serving(2,270)] },
  { key: "chicken-rice", name: "Chicken Fried Rice", group: "rice", aliases: ["Chicken Fried Rice Tray"], servings: [serving(2,280),serving(8,1100)] },
  { key: "seafood-rice", name: "Seafood Fried Rice", group: "rice", aliases: ["Seafood Fried Rice Tray"], servings: [serving(2,300),serving(8,1300)] },
  ...([
    ["hototay", "Hototay Soup"], ["nido", "Nido Soup"], ["chopsuey-soup", "Chopsuey Soup"],
    ["wonton", "Wonton Soup"], ["crab-corn", "Crab and Corn"],
  ] as const).map(([key,name]) => ({ key, name, group: "soup" as const, aliases: key === "crab-corn" ? ["Crab and Corn Soup"] : [], servings: [serving(3,220)] })),
  // Photo 4: all orderable extras; corkage is intentionally excluded (fees, not stock).
  { key: "lumpia-gulay", name: "Fried Lumpia Gulay", group: "appetizer", aliases: ["Fried Lumpia Gulay Bilao", "Fried Lumpia Gulay Bilao 30pcs"], servings: [
    { name: "4 pieces", label: "4 pieces", price: 150 }, { name: "10 pieces", label: "10 pieces", price: 360 }, { name: "15 pieces", label: "15 pieces", price: 540 },
    { name: "30 pieces", label: "Bilao · 30 pieces", price: 1200 },
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
  // Photos 6–7: append sizes to their existing recipe above; bundles stay distinct.
  { key: "top4-bilao", name: "Top 4 Ng-Wanam Bilao", group: "family", description: "Pancit, Lumpia, Fried Rice and Fried Chicken.", servings: [serving(6,1450)] },
  { key: "family-meal", name: "Family Meal", group: "family", description: "Fried Rice, Lumpia and Fried Chicken.", servings: [serving(8,1050)] },
  { key: "birthday-meal", name: "Birthday Meal", group: "family", description: "Carbonara, Spaghetti, Lumpia and Garlic Bread. Number of people not specified.", servings: [{ name: "Set", label: "Set", price: 1500 }] },
  { key: "all-in-chicken", name: "All In Chicken Bilao", group: "family", description: "Chicken Fried Rice, Chicken Lumpia Shanghai and Fried Chicken.", servings: [rangeServing(6,8,1500)] },
  { key: "party-box", name: "Party Box", group: "family", description: "Bihon Guisado, Spaghetti, Lumpia Shanghai and Chicken Tenders. Number of people not specified.", servings: [{ name: "Box", label: "Box", price: 2000 }] },
  // Photo 8: Chicken party trays. Explicit pre-order flag, not just a category name.
  ...([
    ["chicken-afritada", "Chicken Afritada", 12, 15, 1700], ["chicken-tenders", "Chicken Tenders", 12, 15, 1700],
    ["chicken-curry", "Chicken Curry", 12, 15, 1700], ["chicken-mushroom", "Chicken Creamy Mushroom", 12, 15, 1700],
    ["chicken-salpicao", "Chicken Salpicao", 12, 15, 1700], ["chicken-kaldereta", "Chicken Kaldereta", 12, 15, 1900],
  ] as const).map(([key,name,min,max,price]) => ({ key, name, group: "party" as const, requiresPreorder: true, servings: [rangeServing(min,max,price)] })),
  ...([
    ["chicken-ala-king", "Chicken Ala King"], ["garlic-chicken", "Garlic Buttered Chicken"],
  ] as const).map(([key,name]) => ({ key, name, group: "party" as const, requiresPreorder: true, servings: [serving(10,1700)] })),
  // Photo 9: kilos are a weight, never an invented number of people.
  { key: "pork-kaldereta", name: "Pork Kaldereta", group: "party", requiresPreorder: true, servings: [{ name: "3 kilos", label: "3 kilos", price: 3000 }] },
  { key: "breaded-pork", name: "Breaded Pork w/ Mushroom Gravy + Mashed Potato", aliases: ["Breaded Pork with Mushroom Gravy and Mashed Potato", "Breaded Pork"], group: "party", requiresPreorder: true,
    description: "With Mushroom Gravy and Mashed Potato. Number of people not specified.", servings: [{ name: "Party Tray", label: "Party Tray", price: 1700 }] },
  ...([
    ["pork-menudo", "Pork Menudo", 12, 15, 1700], ["pork-salpicao", "Pork Salpicao", 10, 12, 1700],
    ["pork-mushroom", "Creamy Pork Mushroom", 12, 15, 1700], ["filipino-pork-steak", "Filipino Style Pork Steak", 12, 15, 1700],
    ["binagoongan", "Pork Binagoongan", 12, 15, 1700], ["lechon-kare-kare", "Lechon Kare-Kare", 10, 12, 2000],
  ] as const).map(([key,name,min,max,price]) => ({ key, name, group: "party" as const, requiresPreorder: true, servings: [rangeServing(min,max,price)] })),
  // Photo 10: seafood/beef party trays, including per-kilo products.
  ...([
    ["beef-broccoli", "Beef Broccoli", 2000], ["seafood-sweet-chili", "Seafood Mix Sweet & Chili", 2300],
    ["fish-ala-king", "Crispy Fish Fillet Ala King Sauce", 1800],
  ] as const).map(([key,name,price]) => ({ key, name, group: "party" as const, requiresPreorder: true, servings: [rangeServing(10,12,price)] })),
  ...([
    ["buttered-shrimp", "Buttered Shrimp"], ["chili-shrimp", "Sweet & Chili Shrimp"],
  ] as const).map(([key,name]) => ({ key, name, group: "party" as const, requiresPreorder: true, servings: [{ name: "Per kilo", label: "Per kilo", price: 1800 }] })),
];

export function normalizeMenuName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\bw\s*\//g, " with ").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
    .replace(/\bhong kong\b/g,"hongkong").replace(/\bgreen peas\b/g,"greenpeas");
}
