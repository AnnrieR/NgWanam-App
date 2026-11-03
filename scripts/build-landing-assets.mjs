// Generate lightweight hero cutouts from the restaurant's existing photos.
// Originals stay untouched; no third-party images or runtime processing.
import fs from "node:fs/promises";
import sharp from "sharp";

const directory = "public/landing";
await fs.mkdir(directory, { recursive: true });
const dishes = [
  { name: "fried-chicken", source: "CHICKEN/Fried Chicken.png", width: 600,
    path: "M12 330 Q10 322 40 312 L951 123 Q979 110 992 140 L1245 602 Q1254 640 1254 680 L1254 850 L103 1078 Q73 1082 65 1045 Z" },
  { name: "lumpia", source: "FAMILY SIZE/LUMPIA BILAO_.png", width: 750,
    path: "M625 60 C962 60 1228 309 1238 620 C1249 927 1008 1204 665 1205 C284 1207 22 998 16 634 C10 324 281 59 625 60Z" },
  { name: "pancit", source: "FAMILY SIZE/Canton_.png", width: 850,
    path: "M220 54 Q116 58 94 151 L18 1040 Q9 1175 141 1205 L1088 1213 Q1225 1206 1234 1071 L1178 167 Q1170 62 1078 51 Z" },
  { name: "sweet-sour-chicken", source: "CHICKEN/Sweet & Sour Chicken.png", width: 750,
    path: "M645 2 C791 0 930 0 1055 24 Q1205 61 1302 233 Q1486 492 1366 765 Q1318 899 1121 960 Q856 1038 505 998 Q241 966 181 806 Q80 551 182 312 Q251 131 340 59 Q466 13 645 2Z" },
];
for (const dish of dishes) {
  const image = sharp(`public/menu-images/${dish.source}`);
  const { width, height } = await image.metadata();
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><path d="${dish.path}" fill="white"/></svg>`);
  await image.ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).toBuffer()
    .then(buffer => sharp(buffer).trim({ threshold: 8 }).resize({ width: dish.width }).webp({ quality: 86 }).toFile(`${directory}/${dish.name}.webp`));
}

// Keep the actual brand mark, separating its gold artwork from the red disk.
const { data, info } = await sharp("public/menu-images/ng wanam logo.png").resize(700, 700).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let index = 0; index < data.length; index += 4) {
  const red = data[index], green = data[index + 1], blue = data[index + 2];
  const opacity = Math.max(0, Math.min(1, (green / Math.max(red, 1) - 0.43) / 0.26));
  data[index + 3] = Math.round(data[index + 3] * opacity * (red > 140 && blue < 180 ? 1 : 0));
  data[index] = 255; data[index + 1] = 196; data[index + 2] = 47;
}
await sharp(data, { raw: info }).trim().resize({ width: 280 }).webp({ lossless: true }).toFile(`${directory}/brand-mark.webp`);
for (const name of [...dishes.map(dish => dish.name), "brand-mark"]) {
  const { size } = await fs.stat(`${directory}/${name}.webp`);
  if (size >= 1024 * 1024) throw Error(`${name} exceeds the image size policy`);
  console.log(`${name}: ${Math.round(size / 1024)} KB`);
}
