/** Same product listed by two vendors (same name apart from emoji and
 *  punctuation): keep one — the cheaper, else the first. Used on the home
 *  page, where a repeated card looks like a mistake; category and search
 *  pages keep showing every vendor's listing. */
export function uniqueByName<T extends { name: string; price: number }>(products: T[]): T[] {
  const key = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const best = new Map<string, T>();
  for (const p of products) {
    const k = key(p.name);
    const cur = best.get(k);
    if (!cur || p.price < cur.price) best.set(k, p);
  }
  // keep the original order, one entry per name
  const seen = new Set<string>();
  return products.filter((p) => {
    const k = key(p.name);
    if (seen.has(k) || best.get(k) !== p) return false;
    seen.add(k);
    return true;
  });
}
