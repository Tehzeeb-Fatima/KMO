/** The product's main photo: lowest sort_order. Embedded product_images come
 *  back in no particular order, so never just take [0]. */
export function mainImageUrl(images: { url: string; sort_order: number }[] | null | undefined): string | undefined {
  if (!images?.length) return undefined;
  return images.reduce((best, img) => (img.sort_order < best.sort_order ? img : best)).url;
}

const STORAGE_PREFIX = "/storage/v1/object/public/";

// ImageKit URL endpoint (origin: Supabase public storage). Empty = serve
// photos straight from Supabase.
const IMAGEKIT_URL = "https://ik.imagekit.io/t2ijfneyb";

/** Serves a Supabase Storage photo through ImageKit (resized, WebP, cached),
 *  so customers' downloads don't count against Supabase egress. Any other URL,
 *  or no ImageKit endpoint configured, comes back unchanged. */
export function cdnImage(url: string, width?: number): string;
export function cdnImage(url: string | null | undefined, width?: number): string | undefined;
export function cdnImage(url: string | null | undefined, width?: number): string | undefined {
  if (!url || !IMAGEKIT_URL) return url ?? undefined;
  const at = url.indexOf(STORAGE_PREFIX);
  if (at === -1) return url;
  const path = url.slice(at + STORAGE_PREFIX.length);
  return `${IMAGEKIT_URL}/${path}${width ? `${path.includes("?") ? "&" : "?"}tr=w-${width}` : ""}`;
}
