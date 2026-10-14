/**
 * Product options. A variant row can carry one option ("Size" / "M") or a
 * combination joined with " / " ("Colour / Size" / "Ivory / M") — one row per
 * colour-and-size pair, so an order always keeps both choices.
 */
export const OPTION_SEPARATOR = " / ";

interface VariantLike {
  option_name: string;
  option_value: string;
}

/** { Colour: "Ivory", Size: "M" } */
export function variantOptions(v: VariantLike): Record<string, string> {
  const names = v.option_name.split(OPTION_SEPARATOR);
  const values = v.option_value.split(OPTION_SEPARATOR);
  const out: Record<string, string> = {};
  names.forEach((n, i) => {
    out[n.trim()] = (values[i] ?? "").trim();
  });
  return out;
}

/** "Colour: Ivory, Size: M" */
export function variantLabel(v: VariantLike): string {
  return Object.entries(variantOptions(v))
    .map(([n, val]) => `${n}: ${val}`)
    .join(", ");
}

export const isColourOption = (name: string) => ["color", "colour"].includes(name.trim().toLowerCase());

/** Option names with their values, in first-seen order: [["Colour", ["Ivory","Mint"]], ["Size", ["M","L"]]] */
export function optionGroups(variants: VariantLike[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const v of variants) {
    for (const [n, val] of Object.entries(variantOptions(v))) {
      const list = groups.get(n) ?? [];
      if (!list.includes(val)) list.push(val);
      groups.set(n, list);
    }
  }
  return [...groups.entries()];
}

/** Row whose options all agree with the selection (and the selection covers them). */
export function findVariant<T extends VariantLike>(variants: T[], selected: Record<string, string>): T | null {
  return (
    variants.find((v) => {
      const opts = variantOptions(v);
      return Object.entries(opts).every(([n, val]) => selected[n] === val);
    }) ?? null
  );
}
