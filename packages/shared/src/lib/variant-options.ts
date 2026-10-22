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
  multicolour: "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)",
  "jet black": "#111111", navy: "#1f2a52", burgundy: "#6d1a2b", "scarlet red": "#d4141e", "dark brown": "#4a2c20",
  emerald: "#0f6b55", "pine green": "#0f5f5c", "ash grey": "#5c5f63", "denim grey": "#6f7f8e", "rose pink": "#d9a0a4",
  "coral pink": "#e57a6e", "blush pink": "#c85a86", "pale gold": "#d8b97a", "butter cream": "#efdcb2",
};
/** CSS background for a colour swatch. */
export function swatchColour(name: string): string {
  const key = name.trim().toLowerCase();
  return SWATCH[key] ?? key;
}

/** Swatch for a colour name the browser or our list knows, else null
 *  (then the colour comes from the option's photo). */
export function knownSwatch(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (SWATCH[key]) return SWATCH[key];
  const css = key.replace(/[\s-]+/g, "");
  if (typeof CSS !== "undefined" && CSS.supports("color", css)) return css;
  return null;
}

/** The product colour a search names ("white slipper" → "White"), longest
 *  match first so "Black Green" beats "Black". Null when none is named. */
export function colourInSearch(variants: VariantLike[], search: string): string | null {
  const words = ` ${search.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  const colours = optionGroups(variants)
    .filter(([name]) => isColourOption(name))
    .flatMap(([, values]) => values)
    .sort((a, b) => b.length - a.length);
  return colours.find((c) => c && words.includes(` ${c.toLowerCase()} `)) ?? null;
}

/** First photo of one colour (photos are tied to that colour's variant rows). */
export function colourImageUrl(
  variants: (VariantLike & { id: string })[],
  images: { url: string; sort_order: number; variant_id?: string | null }[] | null | undefined,
  colour: string,
): string | undefined {
  const ids = new Set(
    variants
      .filter((v) => Object.entries(variantOptions(v)).some(([n, val]) => isColourOption(n) && val === colour))
      .map((v) => v.id),
  );
  const own = (images ?? []).filter((i) => i.variant_id && ids.has(i.variant_id));
  if (!own.length) return undefined;
  return own.reduce((best, img) => (img.sort_order < best.sort_order ? img : best)).url;
}

const LETTER_SIZE_RUN = /^(?:(?:XXXL|XXL|XLL|XL|XS|S|M|L)[.\s/-]*){2,}$/i;
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Splits what a vendor typed into separate sizes. Commas always separate;
 *  a run of letter sizes typed with dots, spaces or slashes ("S.M.L.XL.XXL")
 *  is split too, while values like "2.4" or "1.5 Ton" stay whole. */
export function splitSizes(input: string): string[] {
  const out: string[] = [];
  for (const part of input.split(/[,;|]/).map((x) => x.trim()).filter(Boolean)) {
    if (LETTER_SIZE_RUN.test(part)) {
      const sizes = part
        .toUpperCase()
        .match(/XXXL|XXL|XLL|XL|XS|S|M|L/g)!
        .map((s) => (s === "XLL" ? "XXL" : s))
        .sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
      out.push(...sizes);
    } else {
      out.push(part);
    }
  }
  return [...new Set(out)];
}

/** One entry per colour that has its own tagged photo, in option order — lets a
 *  store page show each colour as its own card (Daraz style). Empty when the
 *  product has fewer than two such colours, so it stays a single card. */
export function colourCards(
  variants: (VariantLike & { id: string })[],
  images: { url: string; sort_order: number; variant_id?: string | null }[] | null | undefined,
): { colour: string; imageUrl: string }[] {
  const colours: string[] = [];
  for (const [name, values] of optionGroups(variants)) if (isColourOption(name)) colours.push(...values);
  const cards = colours.flatMap((colour) => {
    const imageUrl = colourImageUrl(variants, images, colour);
    return imageUrl ? [{ colour, imageUrl }] : [];
  });
  return cards.length >= 2 ? cards : [];
}
