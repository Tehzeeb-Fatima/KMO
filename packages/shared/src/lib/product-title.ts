/** One house style for product names, whatever the vendor typed: plain
 * letters (no 𝐁𝐨𝐥𝐝/𝘐𝘵𝘢𝘭𝘪𝘤 Unicode fonts, no emoji, no S P A C E D letters)
 * in Title Case, with brand spellings and short codes kept as they should be. */

const SMALL_WORDS = new Set(["a", "an", "and", "or", "the", "of", "for", "with", "in", "on", "to", "by", "at", "from", "as", "per", "vs"]);

/** Words always written one way, matched case-insensitively. */
const FIXED = new Map(
  [
    "LED", "LCD", "USB", "USB-C", "AC", "DC", "UV", "XS", "XL", "XXL", "XXXL", "PU", "TV", "HD", "PVC", "MDF", "EVA",
    "RGB", "GPS", "SIM", "PC", "DIY", "ID", "UK", "USA", "KMO", "C&A", "H&M", "3D", "2D", "4K", "OTG", "HDMI", "SS",
    "iPhone", "iPad", "AirPods", "EarPods", "MagSafe", "PlayStation", "YouTube", "WhatsApp", "TikTok",
  ].map((w) => [w.toLowerCase(), w]),
);

const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}\u{FE0F}\u{200B}-\u{200D}\u{2060}]/gu;

const UNITS = new Set(["cm", "mm", "ml", "kg", "ft"]);

function titleWord(word: string, first: boolean, keepCaps: boolean, prev: string): string {
  // Brackets and quotes around a word don't change how the word itself is written.
  const m = word.match(/^([(\[]*)(.*?)([)\],]*)$/)!;
  const [, open, core, close] = m;
  const lower = core.toLowerCase();
  const fixed = FIXED.get(lower);
  if (fixed) return open + fixed + close;
  // Model numbers and measurements ("SR-110", "800ml", "20W", "2.4") stay as typed.
  if (/\d/.test(core)) {
    if (keepCaps) return open + core + close;
    return open + core.replace(/([-/])([A-Za-z]+)/g, (_, sep: string, w: string) => sep + w[0].toUpperCase() + w.slice(1).toLowerCase()) + close;
  }
  // "85 x 35cm" keeps its lowercase x.
  if (lower === "x" && /\d/.test(prev)) return open + lower + close;
  if (UNITS.has(lower) && !first) return open + lower + close;
  // In a normally-written title, an all-caps word is a brand or code (GPOWER, BBQ).
  if (keepCaps && core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core)) return open + core + close;
  if (!first && !open && SMALL_WORDS.has(lower)) return open + lower + close;
  // Capitalise each part of hyphenated words: "co-ord" → "Co-Ord".
  return open + lower.replace(/(^|[-/'‘])([a-z])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase()) + close;
}

export function formatProductTitle(input: string): string {
  let s = input.normalize("NFKC").replace(EMOJI, " ");
  // "C A N D Y · S T R I P E" → "CANDY STRIPE"
  s = s.replace(/(?:\b\p{L} ){2,}\p{L}\b/gu, (run) => run.replace(/ /g, ""));
  s = s
    .replace(/\s*\|\s*/g, " – ")
    .replace(/[·•]+/g, " ")
    .replace(/["“”]/g, "")
    .replace(/^\s*(new arrival|new|sale|hot)\s*[:!-]\s*/i, "")
    .replace(/^["'“”‘’*#~]+|["'“”‘’*#~]+$/g, "")
    .replace(/[!.,;:\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  // A title typed in capitals throughout is shouting, not a list of brand names.
  const letters = s.replace(/[^\p{L}]/gu, "");
  const keepCaps = letters !== letters.toUpperCase();
  return s
    .split(" ")
    .map((w, i, all) => titleWord(w, i === 0, keepCaps, all[i - 1] ?? ""))
    .join(" ");
}

/** Descriptions keep the vendor's wording and line breaks, minus fancy fonts and emoji. */
export function cleanProductText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(EMOJI, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}
