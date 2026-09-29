"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "About us",
  title: "About Karachi Mart Online",
  paragraphs: [
    "Karachi Mart Online (KMO) is a local marketplace built for Karachi's shopkeepers, home-based sellers and independent brands to reach customers online without having to build and run their own website.",
    "We started KMO because most marketplace platforms are built for large sellers with warehouses and logistics teams — not for the tailor in Tariq Road, the home baker in Gulshan, or the jewellery maker working out of a spare room in Nazimabad. KMO gives every one of these sellers their own storefront, order management tools simple enough to use on a phone, and access to customers across the city.",
    "A large share of the sellers on KMO are women-led and home-based businesses — people who often can't invest in a shop-front or a developer, but who make products Karachi already wants to buy. We built KMO to make that easier, not to compete with it.",
    "For customers, KMO combines the convenience of browsing many stores in one place with the reassurance of cash on delivery — you only pay once your order is in your hands.",
  ],
};

const UR = {
  badge: "ہمارے بارے میں",
  title: "کراچی مارٹ آن لائن کے بارے میں",
  paragraphs: [
    "کراچی مارٹ آن لائن (KMO) ایک لوکل مارکیٹ پلیس ہے جو کراچی کے دکانداروں، گھر سے کام کرنے والے سیلرز اور آزاد برانڈز کے لیے بنایا گیا ہے، تاکہ وہ اپنی ویب سائٹ بنائے اور چلائے بغیر آن لائن کسٹمرز تک پہنچ سکیں۔",
    "ہم نے KMO اس لیے شروع کیا کیونکہ زیادہ تر مارکیٹ پلیس پلیٹ فارمز بڑے سیلرز کے لیے بنائے جاتے ہیں جن کے پاس گودام اور لاجسٹکس ٹیمیں ہوتی ہیں — طارق روڈ کے درزی، گلشن کی گھریلو بیکر، یا ناظم آباد میں ایک کمرے سے کام کرنے والے زیور ساز کے لیے نہیں۔ KMO ان تمام سیلرز کو اپنا اسٹور فرنٹ، فون پر آسانی سے استعمال ہونے والے آرڈر مینجمنٹ ٹولز، اور پورے شہر کے کسٹمرز تک رسائی دیتا ہے۔",
    "KMO پر موجود سیلرز کا بڑا حصہ خواتین کی قیادت میں چلنے والے اور گھریلو کاروبار ہیں — ایسے لوگ جو اکثر دکان یا ڈویلپر میں سرمایہ کاری نہیں کر سکتے، لیکن ایسی پراڈکٹس بناتے ہیں جو کراچی پہلے سے خریدنا چاہتا ہے۔ ہم نے KMO کو یہ آسان بنانے کے لیے بنایا، ان سے مقابلہ کرنے کے لیے نہیں۔",
    "کسٹمرز کے لیے، KMO ایک ہی جگہ کئی اسٹورز دیکھنے کی سہولت کو کیش آن ڈیلیوری کے اطمینان کے ساتھ جوڑتا ہے — آپ صرف اسی وقت ادائیگی کرتے ہیں جب آپ کا آرڈر آپ کے ہاتھ میں ہو۔",
  ],
};

export function AboutContent() {
  const { locale } = useLanguage();
  const c = locale === "ur" ? UR : EN;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>

      <div className="mt-6 flex flex-col gap-5 text-[15px] leading-[1.75] text-ink-dark">
        {c.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </main>
  );
}
