/**
 * Categories are two levels deep: main categories (parent_id null) and their
 * sub-categories (e.g. Women's Fashion > Lingerie & Innerwear).
 */

interface CategoryLike {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order?: number;
}

export interface CategoryGroup<T extends CategoryLike> {
  parent: T;
  children: T[];
}

function byOrder<T extends CategoryLike>(a: T, b: T) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);
}

/** Main categories (A–Z), each with its sub-categories in their set order.
 *  A sub-category whose parent is missing from `categories` is shown as its
 *  own group so it never disappears. */
export function groupCategories<T extends CategoryLike>(categories: T[]): CategoryGroup<T>[] {
  const ids = new Set(categories.map((c) => c.id));
  const mains = categories
    .filter((c) => !c.parent_id || !ids.has(c.parent_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return mains.map((parent) => ({
    parent,
    children: categories.filter((c) => c.parent_id === parent.id).sort(byOrder),
  }));
}

/** Main categories only — for navigation strips and vendor assignment. */
export function mainCategories<T extends CategoryLike>(categories: T[]): T[] {
  return categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
}

/** Flat list in tree order with an indented label, for plain <select>s. */
export function categoryOptions<T extends CategoryLike>(
  categories: T[],
): { id: string; label: string; depth: number }[] {
  return groupCategories(categories).flatMap((g) => [
    { id: g.parent.id, label: g.parent.name, depth: 0 },
    ...g.children.map((c) => ({ id: c.id, label: `   ↳ ${c.name}`, depth: 1 })),
  ]);
}

/** "Women's Fashion › Lingerie & Innerwear" for a sub-category, or just the
 *  name for a main category. */
export function categoryPath<T extends CategoryLike>(categories: T[], id: string | null | undefined): string {
  if (!id) return "";
  const c = categories.find((x) => x.id === id);
  if (!c) return "";
  const parent = c.parent_id ? categories.find((x) => x.id === c.parent_id) : undefined;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

/** The category plus all of its sub-categories — what "products in this
 *  category" should match. */
export function categoryWithChildren<T extends CategoryLike>(categories: T[], id: string): string[] {
  return [id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)];
}
