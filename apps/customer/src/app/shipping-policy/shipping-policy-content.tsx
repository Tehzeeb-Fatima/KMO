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
      body: "Delivery charges depend on your city and are set by KMO. Where KMO allows it, a vendor may set its own delivery charge or offer free delivery. The exact charge for each vendor is shown at checkout before you place your order, since a multi-vendor cart creates a separate order per vendor. If no charge is shown, delivery is free.",
    },
    {
      title: "Delivery time",
      body: "Typical delivery within Karachi takes 3–7 working days from when your order is confirmed. Some vendors use their own courier and delivery windows — check the individual store page for specifics.",
    },
    {
      title: "Who delivers your order",
      body: "Vendors either manage their own delivery or use a courier partner such as TCS, Leopards Courier or M&P Express. Where KMO books the courier, the courier's status is synced to your order.",
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
      body: "ڈیلیوری چارجز آپ کے شہر کے حساب سے ہوتے ہیں اور KMO طے کرتا ہے۔ جہاں KMO اجازت دے، وینڈر اپنا ڈیلیوری چارج رکھ سکتا ہے یا مفت ڈیلیوری دے سکتا ہے۔ ہر وینڈر کا اصل چارج آرڈر دینے سے پہلے چیک آؤٹ پر دکھایا جاتا ہے، کیونکہ ملٹی وینڈر کارٹ ہر وینڈر کے لیے الگ آرڈر بناتا ہے۔ اگر کوئی چارج نہ دکھے تو ڈیلیوری مفت ہے۔",
    },
    {
      title: "ڈیلیوری کا وقت",
      body: "کراچی کے اندر عام طور پر آرڈر کنفرم ہونے کے 3–7 کاروباری دنوں میں ڈیلیوری ہو جاتی ہے۔ کچھ وینڈرز اپنا خود کا کوریئر اور ڈیلیوری وقت استعمال کرتے ہیں — تفصیلات کے لیے انفرادی اسٹور پیج دیکھیں۔",
    },
    {
      title: "آپ کا آرڈر کون ڈیلیور کرتا ہے",
      body: "وینڈرز یا تو اپنی ڈیلیوری خود سنبھالتے ہیں یا TCS، Leopards Courier یا M&P Express جیسے کوریئر پارٹنر استعمال کرتے ہیں۔ جہاں KMO کوریئر بک کرتا ہے، کوریئر کا اسٹیٹس آپ کے آرڈر میں اپ ڈیٹ ہوتا رہتا ہے۔",
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
      <p className="font-mono text-[13.5px] uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>

      <div className="mt-6 flex flex-col gap-6 text-[15.5px] leading-[1.75] text-ink-dark">
        {c.sections.map((s) => (
          <div key={s.title}>
            <h2 className="mb-1.5 text-[17px] font-bold text-ink">{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
