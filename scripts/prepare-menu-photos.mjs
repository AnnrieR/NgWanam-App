import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Fixed, reviewed recipe identities, not fuzzy filename-to-product matching.
// Empty names deliberately leave ambiguous photos unmatched for human review.
const mappings = {
  "APPETIZER/Chicharon Bulaklak.png": ["Chicharon Bulaklak"],
  "APPETIZER/extra large siomai.png": ["Extra Large Siomai"],
  "APPETIZER/fish & chips final.png": ["Fish & Chips"],
  "APPETIZER/LUMPIA GULAY.png": ["Fried Lumpia Gulay", "Lumpia Gulay"],
  "APPETIZER/Tokwa_t baboy.png": ["Tokwa't Baboy"],
  "BIRTHDAY MEAL/BIRTHDAY MEAL_.png": ["Birthday Meal"],
  "CHICKEN/Boneless Chicken w_ ham.png": ["Boneless Chicken w/ Ham"],
  "CHICKEN/Chicken Asado.png": ["Chicken Asado"],
  "CHICKEN/Chop Chicken.png": ["Chop Chicken"],
  "CHICKEN/Fried Chicken W_ Vegetables.png": [],
  "CHICKEN/Fried Chicken.png": ["Fried Chicken", "Fried Chicken (Best Seller)"],
  "CHICKEN/Sweet & Sour Chicken.png": ["Sweet & Sour Chicken"],
  "DESSERT/Leche Flan.png": ["Leche Flan"],
  "FAMILY SIZE/ALL IN CHICKEN BILAO_.png": ["All In Chicken Bilao"],
  "FAMILY SIZE/Bihon.png": [],
  "FAMILY SIZE/Canton-bihon.png": ["Canton-Bihon Bilao"],
  "FAMILY SIZE/Canton_.png": [],
  "FAMILY SIZE/FAMILY SIZES TOP 4 BILAO_.png": ["Top 4 Ng-Wanam Bilao"],
  "FAMILY SIZE/FRIED CHICKEN BILAO.png": ["Fried Chicken Bilao"],
  "FAMILY SIZE/FRIED RICE TRAY.png": ["Fried Rice Tray"],
  "FAMILY SIZE/LUMPIA BILAO_.png": ["Lumpia Shanghai Bilao"],
  "FAMILY SIZE/Miki-bihon.png": ["Miki Bihon Bilao"],
  "FAMILY SIZE/Miki-guisado.png": [],
  "FAMILY SIZE/PANCIT TRAY.png": [],
  "PANCIT/bihon final.png": ["Bihon", "Bihon - Pork Lahok"],
  "PANCIT/canton final.png": ["Canton", "Canton - Pork Lahok"],
  "PANCIT/lomi final.png": ["Chinese Lomi", "Lomi"],
  "PANCIT/miki guisado final.png": ["Miki Guisado", "Miki Guisado (NG-WANAM Best Seller)", "Miki Guisado - Pork Lahok", "Miki Guisado (Pork)"],
  "PANCIT/pork mami final.png": ["Pork Mami"],
  "PANCIT MEALS/Pancit Meal 1 PM 1.png": ["PM1", "Pancit Meal 1"],
  "PANCIT MEALS/Pancit Meal 2 PM 2.png": ["PM2", "Pancit Meal 2"],
  "PANCIT MEALS/Pancit Meal 3 PM 3.png": ["PM3", "Pancit Meal 3"],
  "PANCIT MEALS/Pancit Meal 4 PM_.png": ["PM4", "Pancit Meal 4"],
  "PANCIT MEALS/Pancit Meal 5 PM 5.png": ["PM5", "Pancit Meal 5"],
  "PARTY TRAY/breaded pork w mashed potato party tray.png": ["Breaded Pork w/ Mushroom Gravy + Mashed Potato", "Breaded Pork with Mushroom Gravy and Mashed Potato", "Breaded Pork"],
  "PARTY TRAY/chicken afritada party tray.png": ["Chicken Afritada"],
  "PARTY TRAY/chicken ala king party tray.png": ["Chicken Ala King"],
  "PARTY TRAY/creamy mushroom pork party tray.png": ["Creamy Pork Mushroom"],
  "PARTY TRAY/PARTY BOX_.png": ["Party Box"],
  "PARTY TRAY/pork binagoongan party tray.png": ["Pork Binagoongan"],
  "PORK/halo guisado.png": ["Halo Guisado"],
  "PORK/Halo Prito.png": ["Halo Prito"],
  "PORK/Lechon Kawali.png": ["Lechon Kawali"],
  "PORK/Lechon w_ Vegetables.png": ["Lechon w/ Vegetables"],
  "PORK/Lumpia.png": ["Lumpia Shanghai", "Lumpia Shanghai 20pcs", "Lumpia Shanghai (20 pcs)"],
  "PORK/Pata Tim Special.png": ["Pata Tim Special"],
  "PORK/Pork liver w_ Greenpeas.png": ["Pork Liver w/ Greenpeas"],
  "PORK/Pork Sisig.png": ["Pork Sisig"],
  "PORK/Sweet & Sour Pork.png": ["Sweet & Sour Pork"],
  "RICE/Fried rice.png": ["Fried Rice"],
  "RICE MEALS/rm1 final.png": ["RM1", "Rice Meal 1"],
  "RICE MEALS/rm2.png": ["RM2", "Rice Meal 2"],
  "RICE MEALS/rm5 final.png": ["RM5", "Rice Meal 5"],
  "SALO-SALO TRAY/Ball n Ball.png": ["Ball n Ball"],
  "SANDWICHES/chicken sandwich.png": ["Chicken Sandwich"],
  "SANDWICHES/crispy chicken sandwich.png": ["Crispy Chicken Sandwich"],
  "SANDWICHES/deluxe sandwich combo.png": ["Deluxe Sandwich Combo"],
  "SANDWICHES/ham & cheese sandwich.png": ["Ham & Cheese Sandwich"],
  "SANDWICHES/ham & egg sandwich.png": ["Ham & Egg Sandwich"],
  "SANDWICHES/hotdog overload sandwich.png": ["Hotdog Overload Sandwich"],
  "SEAFOOD/Fried Shrimp w_ Sweet & Sour Sauce.png": ["Fried Shrimp w/ Sweet & Sour Sauce"],
  "SOUP/crab & corn soup.png": ["Crab and Corn", "Crab and Corn Soup", "Crab & Corn Soup"],
  "SOUP/wonton soup.png": ["Wonton Soup"],
  "VEGETABLE/beef ampalaya final.png": ["Beef w/ Ampalaya", "Beef Ampalaya"],
  "VEGETABLE/pork ampalaya final.png": ["Pork Ampalaya"],
  "VEGETABLE/pork chopseuy final.png": ["Pork Chopsuey", "Pork Chopseuy", "Pork Chopsuey Family"],
  "VEGETABLE/shrimp chopseuy final.png": ["Shrimp Chopsuey", "Shrimp Chopseuy"],
};

const source = process.argv[2];
if (!source) throw Error('Usage: node scripts/prepare-menu-photos.mjs "PATH TO EXTRACTED NG WANAM MENU pics"');
const destination = "public/prepared-menu-photos";
await fs.mkdir(destination, { recursive: true });
const manifest = [];
for (const [file, names] of Object.entries(mappings)) {
  const key = file.replace(/\.png$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
  const image = await sharp(path.join(source, ...file.split("/"))).rotate().resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  if (image.length <= 0 || image.length >= 1_000_000) throw Error(`Image must be strictly below 1 MB: ${file}`);
  await fs.writeFile(`${destination}/${key}.webp`, image);
  manifest.push({ key, source: file, names, bytes: image.length, sha256: createHash("sha256").update(image).digest("hex"), note: names.length ? "Exact recipe names only; existing photos are preserved." : file.startsWith("CHICKEN/") ? "Confirm whether this is HongKong Style or the distinct Salo-Salo recipe first." : "Serving/lahok identity is unclear or shares a menu item with a different photo. Needs review." });
}
await fs.writeFile("src/lib/menu-photo-assets.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Prepared ${manifest.length} WebP photos, ${(manifest.reduce((sum, image) => sum + image.bytes, 0) / 1_000_000).toFixed(2)} MB total; every file strictly below 1 MB. Originals unchanged. No database/network calls.`);
