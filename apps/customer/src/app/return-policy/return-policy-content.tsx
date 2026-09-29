"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Legal",
  title: "Return policy",
  sections: [
    {
      title: "Returns are managed by KMO",
      body: "Unlike some marketplaces, returns on KMO are reviewed and processed by our own team, not the individual vendor — so you get a consistent, fair process no matter which store you bought from.",
    },
    {
      title: "How to request a return",
      body: "Open Your Orders, find the delivered item, and submit a return request with a reason. Our team reviews each request individually, usually within a few working days.",
    },
    {
      title: "What happens next",
      body: "If your return is approved, we'll arrange pickup of the item and resolve the request through a replacement or store credit. If it's rejected, we'll explain why in your account.",
    },
    {
      title: "No standard monetary refunds",
      body: "KMO does not offer cash refunds as a standard option. Approved returns are resolved through replacement or store credit rather than a refund to your original payment method.",
    },
    {
      title: "Items that can't be returned",
      body: "Perishable goods (such as groceries), personal care items that have been opened, and made-to-order products are generally not eligible for return unless they arrive damaged or significantly different from what was listed.",
    },
  ],
};

const UR = {
  badge: "قانونی",
  title: "واپسی کی پالیسی",
  sections: [
    {
      title: "واپسی KMO منظم کرتا ہے",
      body: "کچھ مارکیٹ پلیسز کے برعکس، KMO پر واپسیوں کا جائزہ اور عمل ہماری اپنی ٹیم کرتی ہے، انفرادی وینڈر نہیں — تاکہ آپ کو یکساں اور منصفانہ طریقہ ملے، چاہے آپ نے کسی بھی اسٹور سے خریدا ہو۔",
    },
    {
      title: "واپسی کی درخواست کیسے دیں",
      body: "Your Orders کھولیں، ڈیلیور شدہ آئٹم تلاش کریں، اور وجہ کے ساتھ واپسی کی درخواست جمع کریں۔ ہماری ٹیم ہر درخواست کا انفرادی جائزہ لیتی ہے، عام طور پر چند کاروباری دنوں میں۔",
    },
    {
      title: "اس کے بعد کیا ہوتا ہے",
      body: "اگر آپ کی واپسی منظور ہو جائے، تو ہم آئٹم کی پک اپ کا انتظام کریں گے اور درخواست کو تبدیلی یا اسٹور کریڈٹ کے ذریعے حل کریں گے۔ اگر یہ مسترد ہو جائے، تو ہم آپ کے اکاؤنٹ میں وجہ بتائیں گے۔",
    },
    {
      title: "معیاری رقم کی واپسی نہیں",
      body: "KMO معیاری آپشن کے طور پر نقد رقم کی واپسی پیش نہیں کرتا۔ منظور شدہ واپسیاں آپ کے اصل ادائیگی کے طریقے پر رقم واپسی کی بجائے تبدیلی یا اسٹور کریڈٹ کے ذریعے حل کی جاتی ہیں۔",
    },
    {
      title: "وہ اشیاء جو واپس نہیں کی جا سکتیں",
      body: "خراب ہونے والی اشیاء (جیسے گروسری)، کھولی گئی پرسنل کیئر اشیاء، اور آرڈر پر بنائی گئی پراڈکٹس عام طور پر واپسی کے اہل نہیں ہیں جب تک وہ خراب حالت میں یا درج کردہ سے کافی مختلف نہ پہنچیں۔",
    },
  ],
};

export function ReturnPolicyContent() {
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
