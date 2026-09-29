"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Legal",
  title: "Shipping policy",
  sections: [
    {
      title: "Delivery areas",
      body: "KMO delivers across Karachi. Cash on Delivery is available citywide.",
    },
    {
      title: "Delivery charges",
      body: "Most vendors offer free delivery on orders over Rs. 2,500, with a flat Rs. 120 delivery charge on smaller orders. Delivery charges are calculated per vendor at checkout, since a multi-vendor cart creates a separate order per vendor.",
    },
    {
      title: "Delivery time",
      body: "Typical delivery within Karachi takes 1–2 working days from when your order is confirmed. Some vendors use their own courier and delivery windows — check the individual store page for specifics.",
    },
    {
      title: "Who delivers your order",
      body: "Vendors either manage their own delivery or use a courier partner such as TCS, Leopards Courier or M&P Express. Vendors can also opt into KMO-managed shipping where available.",
    },
    {
      title: "Order tracking",
      body: "You can follow your order's status — from confirmed through to delivered — from Your Orders in your account.",
    },
  ],
};

const UR = {
  badge: "قانونی",
  title: "شپنگ پالیسی",
  sections: [
    {
      title: "ڈیلیوری کے علاقے",
      body: "KMO پورے کراچی میں ڈیلیور کرتا ہے۔ کیش آن ڈیلیوری پورے شہر میں دستیاب ہے۔",
    },
    {
      title: "ڈیلیوری چارجز",
      body: "زیادہ تر وینڈرز Rs. 2,500 سے زیادہ کے آرڈرز پر مفت ڈیلیوری دیتے ہیں، چھوٹے آرڈرز پر فلیٹ Rs. 120 ڈیلیوری چارج لگتا ہے۔ ڈیلیوری چارجز چیک آؤٹ پر فی وینڈر شمار کیے جاتے ہیں، کیونکہ ملٹی وینڈر کارٹ ہر وینڈر کے لیے الگ آرڈر بناتا ہے۔",
    },
    {
      title: "ڈیلیوری کا وقت",
      body: "کراچی کے اندر عام طور پر آرڈر کنفرم ہونے کے 1–2 کاروباری دنوں میں ڈیلیوری ہو جاتی ہے۔ کچھ وینڈرز اپنا خود کا کوریئر اور ڈیلیوری وقت استعمال کرتے ہیں — تفصیلات کے لیے انفرادی اسٹور پیج دیکھیں۔",
    },
    {
      title: "آپ کا آرڈر کون ڈیلیور کرتا ہے",
      body: "وینڈرز یا تو اپنی ڈیلیوری خود سنبھالتے ہیں یا TCS، Leopards Courier یا M&P Express جیسے کوریئر پارٹنر استعمال کرتے ہیں۔ وینڈرز جہاں دستیاب ہو وہاں KMO کی منظم شپنگ بھی چن سکتے ہیں۔",
    },
    {
      title: "آرڈر ٹریکنگ",
      body: "آپ اپنے اکاؤنٹ میں Your Orders سے اپنے آرڈر کی حیثیت — کنفرم سے ڈیلیورڈ تک — دیکھ سکتے ہیں۔",
    },
  ],
};

export function ShippingPolicyContent() {
  const { locale } = useLanguage();
  const c = locale === "ur" ? UR : EN;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        {c.sections.map((s) => (
          <div key={s.title}>
            <h2 className="mb-1.5 text-base font-bold text-ink">{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
