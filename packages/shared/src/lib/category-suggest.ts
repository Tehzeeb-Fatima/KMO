/** Suggests the right sub-category from a product name, so vendors don't
 * squeeze products into the nearest category they happen to see. */

interface Cat {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

/** Words shoppers and vendors use, per sub-category slug. Matched as whole words. */
const KEYWORDS: Record<string, string[]> = {
  "electronics-home-appliances": ["digital air fryer", "electric air fryer", "blender", "hand mixer", "electric chopper", "meat chopper", "oven toaster", "electric oven", "sandwich maker", "waffle maker", "rice cooker", "ceramic cooker", "kettle", "steam iron", "heater", "room heater", "lint remover", "juicer", "grinder"],
  "electronics-mobile-accessories": ["charger", "adapter", "adopater", "cable", "power adapter", "usb", "otg", "holder stand"],
  "electronics-mobile-cases-covers": ["case", "cover for iphone", "phone case", "mobile cover", "back cover", "magsafe case"],
  "electronics-earbuds-headphones": ["earbuds", "earpods", "airpods", "headphone", "headphones", "earphone", "handsfree"],
  "electronics-smart-watches": ["smart watch", "smartwatch"],
  "electronics-power-banks": ["power bank", "powerbank"],
  "home-living-kitchenware-cookware": ["pan", "pot", "handi", "karahi", "tawa", "jug", "bottle", "flask", "tumbler", "lunch box", "tiffin", "spatula", "peeler", "grater", "cutter", "strainer", "colander", "oil dispenser", "oil spray", "ice tray", "kitchen", "utensil", "wax paper", "air fryer liner", "roti", "mold"],
  "home-living-dinner-sets-crockery": ["dinner set", "plate", "plates", "crockery", "cup set", "mug", "tea set", "glass set"],
  "home-living-storage-organisers": ["organizer", "organiser", "rack", "shelf", "storage", "container", "hanger", "hook", "jewellery box", "drawer", "basket"],
  "home-living-home-decor": ["tissue box", "wall sticker", "vase", "decor", "décor", "frame", "lamp shade", "floor mat", "showpiece", "candle"],
  "home-living-cleaning-supplies": ["mop", "duster", "wipes", "cleaning", "brush cleaner", "drain", "pegs", "spray mop", "stain remover", "crease remover", "wrinkle"],
  "home-living-bedsheets-bedding": ["bedsheet", "bed sheet", "pillow cover", "comforter", "duvet", "blanket", "quilt"],
  "home-living-curtains-cushions": ["curtain", "cushion"],
  "home-living-lights-lamps": ["lamp", "light", "bulb", "fairy lights"],
  "home-living-tools-hardware": ["screwdriver", "tool box", "toolbox", "drill", "plier", "tape measure"],
  "home-living-travel-luggage": ["travel bag", "duffel", "luggage", "suitcase", "mummy bag", "maternity bag", "travel pillow"],
  "home-living-car-bike-accessories": ["car", "bike", "motorcycle", "70cc", "125cc"],
  "home-living-prayer-mats-islamic-decor": ["prayer mat", "janamaz", "jai namaz", "tasbeeh", "quran stand", "rehal"],
  "beauty-personal-care-skincare": ["face mask", "sheet mask", "serum", "face wash", "scrub", "moisturizer", "sunblock", "multani mitti", "whitening", "cream"],
  "beauty-personal-care-makeup": ["lipstick", "foundation", "mascara", "eyeliner", "makeup", "blush", "compact powder", "nail polish"],
  "beauty-personal-care-haircare": ["hair brush", "comb", "shampoo", "hair oil", "scalp", "conditioner", "hair serum"],
  "beauty-personal-care-fragrances-attar": ["perfume", "attar", "fragrance", "body spray", "body mist"],
  "beauty-personal-care-bath-body": ["soap", "body wash", "towel", "bath", "loofah", "scrub glove", "soap dispenser"],
  "beauty-personal-care-beauty-tools-devices": ["trimmer", "massager", "facial brush", "eye mask", "makeup brush", "epilator", "straightener", "curler"],
  "beauty-personal-care-mehndi-nail-care": ["mehndi", "henna", "manicure", "pedicure", "nail"],
  "toys-baby-toys-games": ["toy", "toys", "game", "puzzle", "doll", "play mat", "building blocks"],
  "toys-baby-educational-toys": ["educational", "learning", "writing book", "sanku", "flash cards", "magic book"],
  "toys-baby-baby-care": ["baby nail", "baby care", "baby oil", "baby lotion", "baby trimmer"],
  "toys-baby-baby-feeding": ["feeder", "feeding bottle", "sipper", "bib"],
  "toys-baby-diapers-wipes": ["diaper", "diapers", "baby wipes"],
  "womens-fashion-nightwear-loungewear": ["nightwear", "night suit", "loungewear", "pajama", "pyjama", "sleepwear"],
  "womens-fashion-western-wear": ["co-ord", "co ord", "tracksuit", "track suit", "jeans", "top", "shirt", "button-down"],
  "womens-fashion-formal-bridal-wear": ["bridal", "lehnga", "lehenga", "maxi", "formal", "sharara", "gharara"],
  "womens-fashion-stitched-ready-to-wear": ["3 piece", "three-piece", "2 piece", "pret", "kurta", "kaftan", "suit"],
  "womens-fashion-unstitched-lawn-khaddar-chiffon": ["unstitched", "lawn", "khaddar", "chiffon"],
  "womens-fashion-women-s-footwear": ["slipper", "slippers", "slides", "heel", "heels", "sandal", "sandals", "khussa", "shoes", "flats"],
  "womens-fashion-handbags-clutches": ["handbag", "clutch", "tote", "shoulder bag", "cross body", "crossbody", "purse", "pouch"],
  "womens-fashion-abaya-hijab-dupatta": ["abaya", "hijab", "dupatta", "niqab", "scarf"],
  "womens-fashion-shawls-stoles": ["shawl", "stole"],
  "kids-fashion-girls-clothing": ["girls", "girl", "frock", "skirt", "skort"],
  "kids-fashion-boys-clothing": ["boys", "boy"],
  "kids-fashion-baby-clothing-0-2-years": ["baby", "romper", "months", "newborn", "toddler"],
  "kids-fashion-kids-footwear": ["kids shoes", "kids sandals", "kids slippers"],
  "kids-fashion-kids-accessories": ["kids bag", "kids cap", "bucket hat", "kids hat"],
  "mens-fashion-innerwear-socks": ["socks", "vest", "boxer", "brief"],
  "mens-fashion-men-s-footwear": ["men shoes", "chappal", "peshawari", "loafer"],
  "mens-fashion-shalwar-kameez-kurta": ["shalwar kameez", "kurta", "kameez"],
  "jewellery-watches-bangles-bracelets": ["bangle", "bangles", "churiyan", "bracelet", "kara"],
  "jewellery-watches-earrings-jhumkay": ["earring", "earrings", "jhumka", "jhumkay", "studs"],
  "jewellery-watches-rings": ["ring", "rings"],
  "jewellery-watches-necklaces-sets": ["necklace", "pendant", "locket", "chain set"],
  "jewellery-watches-hair-accessories-tikka-jhoomar": ["scrunchie", "hair band", "hair clip", "hair catcher", "tikka", "jhoomar"],
  "jewellery-watches-anklets-payal": ["anklet", "payal"],
  "jewellery-watches-women-s-watches": ["ladies watch", "women watch"],
  "jewellery-watches-men-s-watches": ["men watch", "mens watch"],
  "books-stationery-office-supplies": ["calculator", "stapler", "file", "money checker", "office"],
  "books-stationery-pens-art-supplies": ["pen", "pencil", "colour pencils", "paint", "painting kit", "art supplies", "marker", "writing tablet"],
  "books-stationery-notebooks-registers": ["notebook", "register", "diary"],
  "food-items-food-dry-fruits": ["almond", "almonds", "cashew", "walnut", "walnuts", "pistachio", "raisins", "kishmish", "chilgoza", "chelghoza", "dry fruit", "nuts", "seeds", "anjeer", "fig"],
  "food-dry-fruits-dry-fruits-nuts": ["almond", "almonds", "cashew", "walnut", "walnuts", "pistachio", "raisins", "kishmish", "chilgoza", "chelghoza", "dry fruit", "nuts", "seeds", "anjeer", "fig"],
  "food-dry-fruits-dates-khajoor": ["dates", "khajoor", "ajwa"],
  "food-dry-fruits-gift-boxes-hampers": ["gift box", "hamper"],
  "handmade-crafts-crochet-clothing-shawls": ["crochet top", "crochet shawl", "crochet dress"],
  "handmade-crafts-crochet-bags-purses": ["crochet bag", "crochet purse"],
};

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Up to `limit` sub-categories that fit a product name, best match first. */
/** Accessories for an appliance (liners, covers, lids) are not the appliance. */
const ACCESSORY = /\b(liner|liners|cover|lid|stand|holder|case|bag|sheet)\b/;

/** `minScore` 5 = only confident matches (a two-word keyword such as "air fryer"); used for warnings. */
export function suggestCategories<T extends Cat>(productName: string, categories: T[], limit = 3, minScore = 1): T[] {
  const name = ` ${productName.toLowerCase().replace(/[^a-z0-9&'\s-]/g, " ")} `;
  if (name.trim().length < 3) return [];
  // "Girls' top (8 years)" belongs in kids' wear, not women's western wear.
  const forKids = /\b(kids?|girls?|boys?|baby|toddler|years?|months?)\b/.test(name);
  const scored: { cat: T; score: number }[] = [];
  for (const cat of categories) {
    if (forKids && /^(womens|mens)-fashion/.test(cat.slug)) continue;
    if (cat.slug === "electronics-home-appliances" && ACCESSORY.test(name)) continue;
    // Only leaf categories can hold products.
    if (categories.some((c) => c.parent_id === cat.id)) continue;
    const words = [...(KEYWORDS[cat.slug] ?? []), cat.name.toLowerCase().replace(/[^a-z0-9&'\s-]/g, " ")];
    let score = 0;
    for (const w of words) {
      const re = new RegExp(`\\b${escape(w.trim())}\\b`);
      if (w.trim() && re.test(name)) score += w.trim().split(/\s+/).length * 2 + 1;
    }
    if (score >= minScore) scored.push({ cat, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.cat);
}

/** Matches a typed search ("towel", "blender") against category names and keywords. */
export function categoryMatchesSearch(cat: Cat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (cat.name.toLowerCase().includes(q)) return true;
  return (KEYWORDS[cat.slug] ?? []).some((w) => w.includes(q) || q.includes(w));
}
