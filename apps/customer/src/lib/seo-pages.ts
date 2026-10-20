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
      "Shop men's clothing in Karachi: shalwar kameez, kurtas, shirts, tracksuits, footwear and accessories from local stores. Cash on delivery.",
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
      "Bangles, churiyan, earrings, necklace sets, bridal jewellery and watches from local Karachi sellers.",
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
    description: "Buy food items online in Karachi: dry fruits, nuts, dates and gift boxes from local sellers. Cash on delivery.",
    intro: "Dry fruits, nuts, dates, gift boxes and other food items from Karachi sellers, delivered to your door.",
  },
};

export function subCategoryCopy(name: string, parentName?: string): CategoryCopy {
  return {
    title: `${name} Online in Karachi${parentName ? ` – ${parentName}` : ""} | Karachi Mart Online`,
    description: `Shop ${name.toLowerCase()} online in Karachi from verified local sellers on Karachi Mart Online. Cash on delivery across Karachi.`,
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
    vendorSlugs: ["mitti-mart-41c25deb"],
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
];
