/** English copy for the category and keyword landing pages search engines
 * index. Keep it in English (house rule for SEO text). */

export const SITE_URL = "https://karachimartonline.com";

export interface CategoryCopy {
  title: string;
  description: string;
  intro: string;
}

/** Hand-written copy for main categories, by slug. Sub-categories get a generated line. */
export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  "womens-fashion": {
    title: "Women's Clothing Online in Karachi – Lawn, Co-ord Sets, Nightwear & Bags",
    description:
      "Shop women's clothing in Karachi: unstitched lawn, ready-to-wear, formal and bridal wear, co-ord sets, nightwear, footwear and handbags. Cash on delivery.",
    intro:
      "Ready-to-wear suits, co-ord sets, nightwear, formal and bridal outfits, footwear and handbags from verified Karachi sellers. Pay cash when your order arrives.",
  },
  "kids-fashion": {
    title: "Kids Clothes Online in Karachi – Baby, Girls & Boys Wear",
    description:
      "Buy kids clothes in Karachi: baby wear, girls' dresses, boys' hoodies and sets, from newborn to 14 years. Branded pieces, cash on delivery.",
    intro:
      "Clothing for babies, girls and boys from newborn to 14 years: hoodies, sweatshirts, party dresses, rompers and everyday sets. Cash on delivery across Karachi.",
  },
  "mens-fashion": {
    title: "Men's Clothing Online in Karachi – Shalwar Kameez, Tracksuits & More",
    description:
      "Shop men's clothing in Karachi: shalwar kameez, kurtas, shirts, tracksuits, footwear and accessories from Karachi stores. Cash on delivery.",
    intro:
      "Shalwar kameez, kurtas, shirts, tracksuits, footwear and accessories from verified Karachi sellers, delivered to your door.",
  },
  "home-living": {
    title: "Home & Kitchen Products Online in Karachi – Cookware, Storage & Décor",
    description:
      "Buy home and kitchen products in Karachi: cookware, clay pots, storage organisers, home décor, cleaning supplies and tools. Cash on delivery.",
    intro:
      "Kitchenware, clay cookware, storage organisers, home décor, cleaning supplies and tools for every Karachi home. Pay cash on delivery.",
  },
  "beauty-personal-care": {
    title: "Beauty & Personal Care Online in Karachi – Skincare, Makeup & Haircare",
    description:
      "Shop skincare, makeup, haircare, fragrances and grooming products in Karachi from verified sellers. Cash on delivery.",
    intro: "Skincare, makeup, haircare, fragrances and grooming essentials from verified Karachi sellers.",
  },
  electronics: {
    title: "Electronics & Mobile Accessories Online in Karachi – Covers, Chargers & Appliances",
    description:
      "Buy mobile covers, chargers, cables, earbuds and home appliances in Karachi. Air fryers, blenders, ovens and more with cash on delivery.",
    intro:
      "Mobile covers, chargers, cables, earbuds and kitchen appliances such as air fryers, blenders and ovens. Cash on delivery across Karachi.",
  },
  "jewellery-watches": {
    title: "Artificial Jewellery Online in Karachi – Bangles, Earrings & Bridal Sets",
    description:
      "Shop artificial jewellery in Karachi: bangles, churiyan, earrings, necklace sets, bridal jewellery and watches. Cash on delivery.",
    intro:
      "Bangles, churiyan, earrings, necklace sets, bridal jewellery and watches from Karachi sellers.",
  },
  "toys-baby": {
    title: "Toys & Baby Products Online in Karachi",
    description: "Buy toys, educational games and baby care products in Karachi. Cash on delivery.",
    intro: "Toys, educational games and baby care essentials, delivered across Karachi.",
  },
  "books-stationery": {
    title: "Books & Stationery Online in Karachi",
    description: "Shop school books, Islamic books, notebooks and art supplies in Karachi. Cash on delivery.",
    intro: "School books, Islamic books, novels, notebooks and art supplies from Karachi sellers.",
  },
  "handmade-crafts": {
    title: "Handmade Crochet & Crafts Online in Karachi",
    description:
      "Buy handmade crochet clothing, bags, baby sets, toys and gifts made by Karachi artisans. Cash on delivery.",
    intro: "Crochet clothing, bags, baby sets, toys, hand embroidery and gifts, handmade by Karachi artisans.",
  },
  "food-items": {
    title: "Food Items Online in Karachi – Dry Fruits, Nuts, Dates & Gift Boxes",
    description: "Buy food items online in Karachi: dry fruits, nuts, dates and gift boxes from Karachi sellers. Cash on delivery.",
    intro: "Dry fruits, nuts, dates, gift boxes and other food items from Karachi sellers, delivered to your door.",
  },
};

export function subCategoryCopy(name: string, parentName?: string): CategoryCopy {
  return {
    title: `${name} Online in Karachi${parentName ? ` – ${parentName}` : ""} | Karachi Mart Online`,
    description: `Shop ${name.toLowerCase()} online in Karachi from verified Karachi sellers on Karachi Mart Online. Cash on delivery across Karachi.`,
    intro: `Shop ${name.toLowerCase()} from verified Karachi sellers. Pay cash when your order arrives.`,
  };
}

export interface LandingPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  /** Products come from these category slugs (sub-categories included) … */
  categorySlugs?: string[];
  /** … and/or from product names containing any of these words. */
  nameTerms?: string[];
  /** … and/or every live product of these stores. */
  vendorSlugs?: string[];
  faqs: { q: string; a: string }[];
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "mitti-ke-bartan",
    title: "Mitti Ke Bartan in Karachi – Clay Pots, Handi, Tawa & Water Bottles",
    description:
      "Buy mitti ke bartan (clay cookware) online in Karachi: terracotta handi, karahi, tawa, frying pans and clay water bottles. Handmade, glazed, cash on delivery.",
    h1: "Mitti Ke Bartan (Clay Cookware) in Karachi",
    intro: [
      "Handmade terracotta cookware for everyday cooking: clay handi, karahi, roti tawa, frying pans with glass lids, and clay water bottles that keep water naturally cool.",
      "Every piece is sold by a verified Karachi seller and delivered to your door with cash on delivery.",
    ],
    nameTerms: ["terracotta", "clay"],
    vendorSlugs: ["mitti-mart-41c25deb", "hamari-mitti-pakistan-28fdff8b"],
    faqs: [
      {
        q: "Is cooking in clay pots healthy?",
        a: "Clay is a natural material that heats slowly and evenly, keeps moisture in the food and needs less oil. Glazed clay cookware is also easy to clean.",
      },
      {
        q: "How do I season a new clay pot before first use?",
        a: "Soak the pot in water for a few hours, let it dry, rub a little oil inside and heat it on a low flame. Always heat clay cookware slowly and avoid sudden temperature changes.",
      },
      {
        q: "Can I use clay cookware on a gas stove?",
        a: "Yes. Use a low to medium flame and let the pot warm up gradually.",
      },
      {
        q: "Do you deliver across Karachi?",
        a: "Yes. Orders are delivered across Karachi and you pay cash on delivery.",
      },
    ],
  },
  {
    slug: "kids-clothes-karachi",
    title: "Kids Clothes Online in Karachi – Baby, Girls & Boys Branded Wear",
    description:
      "Shop branded kids clothes online in Karachi: baby rompers, girls' dresses, boys' hoodies, sweatshirts and sets from newborn to 14 years. Cash on delivery.",
    h1: "Kids Clothes in Karachi",
    intro: [
      "Quality clothing for babies, girls and boys from newborn to 14 years: hoodies, sweatshirts, party dresses, rompers, joggers and everyday sets.",
      "Each item lists its exact age size, and you pay cash when the parcel arrives.",
    ],
    categorySlugs: ["kids-fashion"],
    faqs: [
      { q: "Which sizes are available?", a: "Each product shows its age size, from 0–3 months up to 14 years." },
      { q: "Can I pay cash on delivery?", a: "Yes. All orders on Karachi Mart Online are cash on delivery." },
    ],
  },
  {
    slug: "ladies-nightwear",
    title: "Ladies Nightwear & Loungewear in Karachi – Silk, Cotton & Co-ord Sets",
    description:
      "Buy ladies nightwear online in Karachi: silk night suits, printed loungewear, co-ord sets and 3-piece sets in sizes S to XXL. Cash on delivery.",
    h1: "Ladies Nightwear & Loungewear in Karachi",
    intro: [
      "Comfortable night suits and loungewear in silk, cotton and ribbed fabrics, available in sizes S, M, L, XL and XXL.",
      "Pick your colour and size, and pay cash on delivery anywhere in Karachi.",
    ],
    categorySlugs: ["womens-fashion-nightwear-loungewear"],
    faqs: [
      { q: "Which sizes are available?", a: "Most sets come in S, M, L, XL and XXL. Select your size on the product page." },
      { q: "Do you deliver across Karachi?", a: "Yes, with cash on delivery." },
    ],
  },
  {
    slug: "kitchen-appliances",
    title: "Kitchen Appliances in Karachi – Air Fryers, Blenders, Ovens & Choppers",
    description:
      "Shop kitchen appliances online in Karachi: air fryers, blenders, hand mixers, electric ovens, choppers and sandwich makers. Cash on delivery.",
    h1: "Kitchen Appliances in Karachi",
    intro: [
      "Air fryers, blenders, hand mixers, electric ovens, meat choppers, sandwich makers and more from trusted brands.",
      "Delivered across Karachi with cash on delivery.",
    ],
    categorySlugs: ["electronics-home-appliances"],
    faqs: [{ q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery." }],
  },
  {
    slug: "mobile-covers",
    title: "Mobile Covers & Accessories in Karachi – iPhone Cases, Chargers & Cables",
    description:
      "Buy mobile covers and accessories online in Karachi: iPhone cases, MagSafe covers, fast chargers, cables and earbuds. Cash on delivery.",
    h1: "Mobile Covers & Accessories in Karachi",
    intro: [
      "Phone cases for iPhone and Samsung, MagSafe covers, fast chargers, cables and earbuds.",
      "Check the model in the product name before ordering. Cash on delivery across Karachi.",
    ],
    categorySlugs: ["electronics-mobile-cases-covers", "electronics-mobile-accessories", "electronics-earbuds-headphones"],
    faqs: [{ q: "How do I know the cover fits my phone?", a: "The phone model is written in each product name. Pick the exact model you use." }],
  },
  {
    slug: "artificial-jewellery",
    title: "Artificial Jewellery in Karachi – Bangles, Churiyan, Earrings & Bridal Sets",
    description:
      "Shop artificial jewellery online in Karachi: bangles, churiyan, earrings, jhumkay, necklace sets and bridal jewellery. Cash on delivery.",
    h1: "Artificial Jewellery in Karachi",
    intro: [
      "Bangles, churiyan, earrings, jhumkay, necklace sets and bridal jewellery for weddings, Eid and everyday wear.",
      "Sold by verified Karachi sellers with cash on delivery.",
    ],
    categorySlugs: ["jewellery-watches"],
    faqs: [{ q: "How do I choose the bangle size?", a: "The bangle size (for example 2.4 or 2.6) is shown on the product. Pick the size you normally wear." }],
  },
  {
    slug: "online-shopping-karachi",
    title: "Online Shopping in Karachi – Karachi Mart Online | Cash on Delivery",
    description:
      "Karachi Mart Online is an online shopping mart for Karachi: clothes, shoes, bags, kitchenware, clay cookware, beauty and more from verified Karachi stores. Cash on delivery.",
    h1: "Online Shopping in Karachi",
    intro: [
      "Karachi Mart Online (KMO) brings verified Karachi stores together in one online mart: ladies suits, kids clothes, shoes, handbags, kitchenware, mitti ke bartan, storage, beauty and more.",
      "Order from home, pay cash when the parcel arrives, and get delivery anywhere in Karachi.",
    ],
    categorySlugs: [
      "womens-fashion-nightwear-loungewear",
      "kids-fashion-girls-clothing",
      "home-living-kitchenware-cookware",
      "home-living-storage-organisers",
      "womens-fashion-handbags-clutches",
    ],
    faqs: [
      { q: "What is Karachi Mart Online?", a: "Karachi Mart Online (KMO) is an online marketplace where verified Karachi stores sell their products, delivered across Karachi." },
      { q: "Can I pay cash on delivery?", a: "Yes. Every order on Karachi Mart Online can be paid in cash when it arrives." },
      { q: "How long does delivery take?", a: "Most orders arrive in 3 to 7 working days." },
    ],
  },
  {
    slug: "ladies-suits-karachi",
    title: "Ladies Suits Online in Karachi – Lawn, Stitched, Formal & Night Suits",
    description:
      "Buy ladies suits online in Karachi: stitched and unstitched lawn suits, formal and bridal wear, co-ord sets and night suits. Cash on delivery.",
    h1: "Ladies Suits in Karachi",
    intro: [
      "Ready-to-wear and unstitched ladies suits, formal and bridal outfits, co-ord sets and night suits from Karachi sellers.",
      "Choose your size and colour on the product page and pay cash on delivery.",
    ],
    categorySlugs: [
      "womens-fashion-stitched-ready-to-wear",
      "womens-fashion-unstitched-lawn-khaddar-chiffon",
      "womens-fashion-formal-bridal-wear",
      "womens-fashion-western-wear",
    ],
    nameTerms: ["suit", "co-ord", "lawn"],
    faqs: [
      { q: "Are the suits stitched or unstitched?", a: "Both are available. Each product says whether it is ready-to-wear or unstitched fabric." },
      { q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery across Karachi." },
    ],
  },
  {
    slug: "ladies-bags-karachi",
    title: "Ladies Bags Online in Karachi – Handbags, Shoulder Bags & Clutches",
    description:
      "Shop ladies bags online in Karachi: handbags, shoulder bags, tote bags, purses and clutches from Karachi sellers. Cash on delivery.",
    h1: "Ladies Bags in Karachi",
    intro: [
      "Handbags, shoulder bags, totes, purses and clutches for daily use, office and weddings.",
      "Delivered across Karachi with cash on delivery.",
    ],
    categorySlugs: ["womens-fashion-handbags-clutches"],
    nameTerms: ["handbag", "purse", "tote", "shoulder bag"],
    faqs: [{ q: "Can I see the bag size before ordering?", a: "Sizes and details are written on each product page. Message us on WhatsApp if you need more photos." }],
  },
  {
    slug: "ladies-shoes-slippers-karachi",
    title: "Ladies Shoes & Slippers Online in Karachi – Heels, Sandals & Chappals",
    description:
      "Buy ladies shoes and slippers online in Karachi: heels, sandals, chappals, flats and casual shoes. Cash on delivery across Karachi.",
    h1: "Ladies Shoes & Slippers in Karachi",
    intro: [
      "Heels, sandals, slippers, chappals, flats and casual shoes for everyday wear, Eid and weddings.",
      "Pick your size on the product page and pay cash when the parcel arrives.",
    ],
    categorySlugs: ["womens-fashion-women-s-footwear"],
    nameTerms: ["slipper", "heel", "sandal", "chappal"],
    faqs: [{ q: "How do I choose my shoe size?", a: "Each product lists its sizes. Pick the size you normally wear in Pakistani or EU sizing as shown." }],
  },
  {
    slug: "shirts-trousers-karachi",
    title: "Shirts, T-Shirts & Trousers Online in Karachi – Men & Boys",
    description:
      "Shop shirts, t-shirts, hoodies and trousers online in Karachi for men and boys. Cash on delivery across Karachi.",
    h1: "Shirts, T-Shirts & Trousers in Karachi",
    intro: [
      "Shirts, t-shirts, hoodies, sweatshirts, trousers and joggers for men and boys.",
      "Sizes are shown on each product. Pay cash on delivery anywhere in Karachi.",
    ],
    categorySlugs: ["kids-fashion-boys-clothing", "mens-fashion-activewear-tracksuits"],
    nameTerms: ["shirt", "trouser", "hoodie", "jogger", "sweatshirt"],
    faqs: [{ q: "Do you have boys' sizes?", a: "Yes. Boys' items show their age size on the product page." }],
  },
  {
    slug: "boys-clothes-karachi",
    title: "Boys Clothes Online in Karachi – Shirts, Hoodies, Trousers & Sets",
    description:
      "Buy boys clothes online in Karachi: shirts, hoodies, sweatshirts, trousers and sets for ages 1 to 14. Cash on delivery.",
    h1: "Boys Clothes in Karachi",
    intro: [
      "Shirts, hoodies, sweatshirts, trousers and matching sets for boys, with the age size on every product.",
      "Delivered across Karachi with cash on delivery.",
    ],
    categorySlugs: ["kids-fashion-boys-clothing"],
    nameTerms: ["boys"],
    faqs: [{ q: "Which ages are available?", a: "Most boys' items come in sizes from 1 year up to 14 years." }],
  },
  {
    slug: "girls-clothes-karachi",
    title: "Girls Clothes Online in Karachi – Frocks, Dresses, Hoodies & Sets",
    description:
      "Shop girls clothes online in Karachi: frocks, party dresses, hoodies, sweatshirts and everyday sets for babies to 14 years. Cash on delivery.",
    h1: "Girls Clothes in Karachi",
    intro: [
      "Frocks, party dresses, hoodies, sweatshirts and everyday sets for girls, from babies up to 14 years.",
      "Every product shows its age size. Pay cash on delivery across Karachi.",
    ],
    categorySlugs: ["kids-fashion-girls-clothing", "kids-fashion-baby-clothing-0-2-years"],
    nameTerms: ["girls", "frock"],
    faqs: [{ q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery." }],
  },
  {
    slug: "hijab-abaya-karachi",
    title: "Hijab, Abaya & Dupatta Online in Karachi",
    description:
      "Buy hijabs, abayas, scarves and dupattas online in Karachi in chiffon, jersey and georgette. Cash on delivery.",
    h1: "Hijab, Abaya & Dupatta in Karachi",
    intro: [
      "Hijabs, scarves, abayas and dupattas in chiffon, jersey, georgette and more colours.",
      "Sold by verified Karachi sellers with cash on delivery.",
    ],
    categorySlugs: ["womens-fashion-abaya-hijab-dupatta"],
    nameTerms: ["hijab", "abaya", "dupatta", "scarf"],
    faqs: [{ q: "Do you deliver across Karachi?", a: "Yes, with cash on delivery." }],
  },
  {
    slug: "eid-shopping-karachi",
    title: "Eid Shopping Online in Karachi – Suits, Kids Clothes, Jewellery & Mehndi",
    description:
      "Do your Eid shopping online in Karachi: ladies suits, kids clothes, bangles and jewellery, mehndi, shoes and gifts. Cash on delivery.",
    h1: "Eid Shopping in Karachi",
    intro: [
      "Everything for Eid in one place: ladies suits and formal wear, kids clothes, bangles and jewellery, mehndi, shoes, bags and gifts.",
      "Order early, pay cash on delivery, and get it delivered anywhere in Karachi.",
    ],
    categorySlugs: [
      "womens-fashion-formal-bridal-wear",
      "womens-fashion-stitched-ready-to-wear",
      "kids-fashion-girls-clothing",
      "jewellery-watches-bangles-bracelets",
      "beauty-personal-care-mehndi-nail-care",
      "handmade-crafts-handmade-gifts-hampers",
    ],
    faqs: [
      { q: "When should I order for Eid?", a: "Delivery usually takes 3 to 7 working days, so order at least a week before Eid." },
      { q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery." },
    ],
  },
  {
    slug: "kitchenware-karachi",
    title: "Kitchenware & Cookware Online in Karachi – Pots, Pans, Tools & Crockery",
    description:
      "Shop kitchenware online in Karachi: cookware, non-stick pans, kitchen tools, dinner sets and crockery. Cash on delivery.",
    h1: "Kitchenware & Cookware in Karachi",
    intro: [
      "Pots, pans, non-stick cookware, kitchen tools, dinner sets and crockery for every Karachi kitchen.",
      "Delivered to your door with cash on delivery.",
    ],
    categorySlugs: ["home-living-kitchenware-cookware", "home-living-dinner-sets-crockery"],
    faqs: [{ q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery." }],
  },
  {
    slug: "storage-organisers-karachi",
    title: "Storage Boxes & Organisers Online in Karachi – Kitchen, Wardrobe & Bathroom",
    description:
      "Buy storage boxes and organisers online in Karachi: kitchen racks, wardrobe and shoe organisers, baskets and bathroom storage. Cash on delivery.",
    h1: "Storage & Organisers in Karachi",
    intro: [
      "Kitchen racks, spice and fridge organisers, wardrobe and shoe organisers, baskets and bathroom storage.",
      "Cash on delivery across Karachi.",
    ],
    categorySlugs: ["home-living-storage-organisers"],
    nameTerms: ["organizer", "organiser", "storage", "rack"],
    faqs: [{ q: "Do you deliver across Karachi?", a: "Yes, with cash on delivery." }],
  },
  {
    slug: "dry-fruits-karachi",
    title: "Dry Fruits Online in Karachi – Almonds, Pistachios, Cashews & Gift Boxes",
    description:
      "Buy dry fruits online in Karachi: almonds, pistachios, cashews, walnuts, raisins and gift boxes. Fresh stock, cash on delivery.",
    h1: "Dry Fruits in Karachi",
    intro: [
      "Almonds, pistachios, cashews, walnuts, raisins and mixed dry fruit gift boxes from a Karachi seller.",
      "Delivered across Karachi with cash on delivery.",
    ],
    categorySlugs: ["food-dry-fruits-dry-fruits-nuts"],
    vendorSlugs: ["karachi-dry-fruit-60f7a0fc"],
    faqs: [{ q: "Are dry fruits available in gift boxes?", a: "Yes. Gift boxes are listed alongside loose dry fruits." }],
  },
  {
    slug: "beauty-products-karachi",
    title: "Beauty Products Online in Karachi – Skincare, Makeup, Haircare & Mehndi",
    description:
      "Shop beauty products online in Karachi: skincare, makeup, haircare, bath and body, beauty tools and mehndi. Cash on delivery.",
    h1: "Beauty Products in Karachi",
    intro: [
      "Skincare, makeup, haircare, bath and body products, beauty tools and mehndi from verified Karachi sellers.",
      "Pay cash on delivery anywhere in Karachi.",
    ],
    categorySlugs: [
      "beauty-personal-care-skincare",
      "beauty-personal-care-makeup",
      "beauty-personal-care-haircare",
      "beauty-personal-care-bath-body",
      "beauty-personal-care-beauty-tools-devices",
      "beauty-personal-care-mehndi-nail-care",
    ],
    faqs: [{ q: "Can I pay cash on delivery?", a: "Yes. All orders are cash on delivery." }],
  },
];
