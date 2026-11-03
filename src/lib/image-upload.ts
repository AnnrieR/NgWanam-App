/** Strictly less than one MiB; storage and server actions use the same limit. */
export const IMAGE_UPLOAD_LIMIT = 1024 * 1024;
export const IMAGE_UPLOAD_MAX_BYTES = IMAGE_UPLOAD_LIMIT - 1;
export const IMAGE_UPLOAD_HINT = "Image must be smaller than 1 MB.";
export function validImageSize(size: number) {
  return size > 0 && size < IMAGE_UPLOAD_LIMIT;
}
