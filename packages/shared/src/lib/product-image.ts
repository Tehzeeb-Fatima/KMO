/** The product's main photo: lowest sort_order. Embedded product_images come
 *  back in no particular order, so never just take [0]. */
export function mainImageUrl(images: { url: string; sort_order: number }[] | null | undefined): string | undefined {
  if (!images?.length) return undefined;
  return images.reduce((best, img) => (img.sort_order < best.sort_order ? img : best)).url;
}
