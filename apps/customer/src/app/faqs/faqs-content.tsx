"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Support",
  title: "Frequently asked questions",
  faqs: [
    {
      q: "How does Cash on Delivery (COD) work?",
      a: "Place your order online with no upfront payment. A rider brings your order to your address, and you pay in cash when it arrives. COD is available citywide across Karachi.",
    },
    {
      q: "Can I order from multiple stores in one checkout?",
      a: "Yes. Your cart can hold products from several vendors at once. At checkout, KMO automatically splits your order into a separate order per vendor, each with its own delivery — you'll see one combined total at checkout and can track each vendor's order separately afterwards.",
    },
    {
      q: "How long does delivery take?",
      a: "Most orders within Karachi arrive within 1–2 working days, though this can vary by vendor and area. Each vendor sets their own delivery estimate and shipping policy on their store page.",
    },
    {
      q: "Can I return a product?",
      a: "Returns are handled directly by KMO, not by individual vendors. If something arrives damaged, wrong, or not as described, open the order in Your Orders and submit a return request with a reason. Our team reviews every request individually.",
    },
    {
      q: "Do you offer refunds?",
      a: "KMO does not currently offer standard monetary refunds. Approved returns are resolved through replacement or store credit, handled case by case by our support team.",
    },
    {
      q: "How do I become a vendor on KMO?",
      a: "Sign up for a vendor account and submit your store details for review. Once our team approves your application, you can set up your storefront and start listing products. Every product you list also goes through a quick review before it goes live.",
    },
    {
      q: "Is my payment information safe?",
      a: "Since KMO currently runs on Cash on Delivery only, no card or bank details are collected online. We're building the platform so that card and digital wallet payments can be added securely in the future.",
    },
  ],
};

const UR = {
  badge: "سپورٹ",
  title: "اکثر پوچھے گئے سوالات",
  faqs: [
    {
      q: "کیش آن ڈیلیوری (COD) کیسے کام کرتی ہے؟",
      a: "کوئی پیشگی ادائیگی کیے بغیر آن لائن آرڈر دیں۔ ایک رائیڈر آپ کا آرڈر آپ کے پتے پر پہنچائے گا، اور پہنچنے پر آپ نقد ادائیگی کریں گے۔ COD پورے کراچی میں دستیاب ہے۔",
    },
    {
      q: "کیا میں ایک ہی چیک آؤٹ میں کئی اسٹورز سے آرڈر کر سکتا ہوں؟",
      a: "جی ہاں۔ آپ کے کارٹ میں ایک ساتھ کئی وینڈرز کی پراڈکٹس ہو سکتی ہیں۔ چیک آؤٹ پر، KMO خودکار طور پر آپ کے آرڈر کو ہر وینڈر کے لیے الگ آرڈر میں تقسیم کر دیتا ہے، ہر ایک کی اپنی ڈیلیوری کے ساتھ — آپ کو چیک آؤٹ پر ایک مشترکہ کل رقم نظر آئے گی اور بعد میں ہر وینڈر کا آرڈر الگ الگ ٹریک کر سکتے ہیں۔",
    },
    {
      q: "ڈیلیوری میں کتنا وقت لگتا ہے؟",
      a: "کراچی کے اندر زیادہ تر آرڈرز 1–2 کاروباری دنوں میں پہنچ جاتے ہیں، اگرچہ یہ وینڈر اور علاقے کے لحاظ سے مختلف ہو سکتا ہے۔ ہر وینڈر اپنی اسٹور پیج پر اپنا ڈیلیوری تخمینہ اور شپنگ پالیسی طے کرتا ہے۔",
    },
    {
      q: "کیا میں پراڈکٹ واپس کر سکتا ہوں؟",
      a: "واپسی براہ راست KMO سنبھالتا ہے، انفرادی وینڈرز نہیں۔ اگر کوئی چیز خراب، غلط، یا بیان کردہ سے مختلف پہنچے، تو Your Orders میں آرڈر کھولیں اور وجہ کے ساتھ واپسی کی درخواست جمع کریں۔ ہماری ٹیم ہر درخواست کا انفرادی جائزہ لیتی ہے۔",
    },
    {
      q: "کیا آپ رقم واپس کرتے ہیں؟",
      a: "KMO فی الحال معیاری رقم کی واپسی پیش نہیں کرتا۔ منظور شدہ واپسیاں ہماری سپورٹ ٹیم کے ذریعے کیس بہ کیس، تبدیلی یا اسٹور کریڈٹ کے ذریعے حل کی جاتی ہیں۔",
    },
    {
      q: "میں KMO پر وینڈر کیسے بنوں؟",
      a: "وینڈر اکاؤنٹ کے لیے سائن اپ کریں اور جائزے کے لیے اپنی اسٹور کی تفصیلات جمع کریں۔ ہماری ٹیم کے آپ کی درخواست منظور کرنے کے بعد، آپ اپنا اسٹور فرنٹ سیٹ اپ کر سکتے ہیں اور پراڈکٹس درج کرنا شروع کر سکتے ہیں۔ ہر پراڈکٹ لائیو ہونے سے پہلے ایک مختصر جائزے سے بھی گزرتی ہے۔",
    },
    {
      q: "کیا میری ادائیگی کی معلومات محفوظ ہے؟",
      a: "چونکہ KMO فی الحال صرف کیش آن ڈیلیوری پر چلتا ہے، آن لائن کوئی کارڈ یا بینک کی تفصیلات جمع نہیں کی جاتیں۔ ہم پلیٹ فارم کو اس طرح بنا رہے ہیں کہ مستقبل میں کارڈ اور ڈیجیٹل والیٹ کی ادائیگیاں محفوظ طریقے سے شامل کی جا سکیں۔",
    },
  ],
};

export function FaqsContent() {
  const { locale } = useLanguage();
  const c = locale === "ur" ? UR : EN;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>

      <div className="mt-6 flex flex-col gap-4">
        {c.faqs.map((item) => (
          <div key={item.q} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[15px] font-bold text-ink">{item.q}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-dark">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
