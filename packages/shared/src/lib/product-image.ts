/** The product's main photo: lowest sort_order. Embedded product_images come
 *  back in no particular order, so never just take [0]. */
export function mainImageUrl(images: { url: string; sort_order: number }[] | null | undefined): string | undefined {
  if (!images?.length) return undefined;
  return images.reduce((best, img) => (img.sort_order < best.sort_order ? img : best)).url;
}

const STORAGE_PREFIX = "/storage/v1/object/public/";
const MEDIA_PREFIX = "https://media.karachimartonline.com/";

// ImageKit URL endpoint. Its origins are the Hostinger media server first and
// Supabase public storage as a fallback; both keep files at bucket/path.
// Empty = serve files straight from where they are stored.
const IMAGEKIT_URL = "https://ik.imagekit.io/t2ijfneyb";

/** bucket/path of a stored file (Hostinger media or Supabase Storage), or null for any other URL. */
function mediaPath(url: string): string | null {
  if (url.startsWith(MEDIA_PREFIX)) return url.slice(MEDIA_PREFIX.length);
  const at = url.indexOf(STORAGE_PREFIX);
  return at === -1 ? null : url.slice(at + STORAGE_PREFIX.length);
}

/** Serves a stored photo through ImageKit (resized, WebP, cached), so
 *  customers' downloads don't hit the origin. Any other URL, or no ImageKit
 *  endpoint configured, comes back unchanged. */
export function cdnImage(url: string, width?: number): string;
export function cdnImage(url: string | null | undefined, width?: number): string | undefined;
export function cdnImage(url: string | null | undefined, width?: number): string | undefined {
  if (!url || !IMAGEKIT_URL) return url ?? undefined;
  const path = mediaPath(url);
  if (path === null) return url;
  return `${IMAGEKIT_URL}/${path}${width ? `${path.includes("?") ? "&" : "?"}tr=w-${width}` : ""}`;
}

/** A stored video (or any file) through ImageKit, unchanged in size. */
export function cdnMedia(url: string): string;
export function cdnMedia(url: string | null | undefined): string | undefined;
export function cdnMedia(url: string | null | undefined): string | undefined {
  if (!url || !IMAGEKIT_URL) return url ?? undefined;
  const path = mediaPath(url);
  return path === null ? url : `${IMAGEKIT_URL}/${path}`;
}
