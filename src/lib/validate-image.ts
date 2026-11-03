import "server-only";
import { validImageSize } from "@/lib/image-upload";

/** Check before allocating bytes; MIME and signature must agree. */
export async function validateImage(file: File, allowAvatarFormats = false) {
  if (!validImageSize(file.size)) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpeg"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp"
        : allowAvatarFormats && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)) ? "gif"
          : allowAvatarFormats && bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32)) ? "avif" : null;
  return type && file.type === `image/${type}` ? { bytes, type } : null;
}
