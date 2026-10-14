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

// Fashion colour names browsers don't know, so swatches still show a colour.
const SWATCH: Record<string, string> = {
  mint: "#bfe8d6", "mint green": "#bfe8d6", "sea green": "#5fb89a", peach: "#ffd0b0", skin: "#f1c9a5",
  nude: "#e3bc9a", "off white": "#f7f3ea", "off-white": "#f7f3ea", cream: "#f6eedb", ivory: "#fffbea",
  champagne: "#f1dfbf", "tea pink": "#f4c2c2", "baby pink": "#f8c8d8", "dusty pink": "#d8a7a7", blush: "#f3c6c6",
  rust: "#b7410e", mustard: "#e1ad21", "bottle green": "#0b4a2e", "olive green": "#708238", "sky blue": "#87ceeb",
  "ice blue": "#d6ecf3", "navy blue": "#1f2a52", "royal blue": "#2a52be", ferozi: "#30b7b0", "zinc": "#7d8086",
  maroon: "#800000", wine: "#722f37", mauve: "#c5a3bf", lilac: "#c8a2c8", lavender: "#d9cff0", gold: "#d4af37",
  silver: "#c0c0c0", "multi": "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)",
  multicolor: "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)",
};
/** CSS background for a colour swatch. */
export function swatchColour(name: string): string {
  const key = name.trim().toLowerCase();
  return SWATCH[key] ?? key;
}
