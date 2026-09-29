"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Legal",
  title: "Privacy policy",
  lastUpdated: "Last updated September 2026",
  contactUs: "Contact us",
  sections: [
    {
      title: "Information we collect",
      body: "When you create an account, we collect your name, phone number, email address and, if you place an order, your delivery address. Vendors additionally provide store details such as a business name, logo and description.",
    },
    {
      title: "How we use your information",
      body: "We use your information to process orders, connect you with the vendors you buy from, show order status and history, and communicate with you about your account or orders. Vendors can see the delivery details needed to fulfil orders you place with them; they do not receive your account password or full order history with other vendors.",
    },
    {
      title: "Sharing with vendors and couriers",
      body: "When you place an order, the relevant vendor and delivery courier receive the information needed to fulfil it — your name, phone number, and delivery address.",
    },
    {
      title: "Data storage and security",
      body: "Your data is stored with Supabase, a managed database provider, and protected using role-based access controls so that customers, vendors and KMO staff can only access data relevant to their role.",
    },
    {
      title: "Your choices",
      body: "You can update your profile information, manage saved addresses, and request account deletion at any time by contacting our support team.",
    },
    { title: "Contact", body: "contactSection" },
  ],
};

const UR = {
  badge: "قانونی",
  title: "پرائیویسی پالیسی",
  lastUpdated: "آخری بار اپ ڈیٹ کیا گیا ستمبر 2026",
  contactUs: "ہم سے رابطہ کریں",
  sections: [
    {
      title: "ہم کون سی معلومات جمع کرتے ہیں",
      body: "جب آپ اکاؤنٹ بناتے ہیں، ہم آپ کا نام، فون نمبر، ای میل ایڈریس اور، اگر آپ آرڈر دیتے ہیں تو، آپ کا ڈیلیوری پتہ جمع کرتے ہیں۔ وینڈرز مزید اسٹور کی تفصیلات فراہم کرتے ہیں جیسے کاروبار کا نام، لوگو اور تفصیل۔",
    },
    {
      title: "ہم آپ کی معلومات کیسے استعمال کرتے ہیں",
      body: "ہم آپ کی معلومات آرڈرز پروسیس کرنے، آپ کو خریدے گئے وینڈرز سے جوڑنے، آرڈر کی حیثیت اور تاریخ دکھانے، اور آپ کے اکاؤنٹ یا آرڈرز کے بارے میں رابطہ کرنے کے لیے استعمال کرتے ہیں۔ وینڈرز صرف وہ ڈیلیوری تفصیلات دیکھ سکتے ہیں جو ان سے کیے گئے آرڈرز کو مکمل کرنے کے لیے ضروری ہیں؛ انہیں آپ کا اکاؤنٹ پاس ورڈ یا دوسرے وینڈرز کے ساتھ مکمل آرڈر تاریخ نہیں ملتی۔",
    },
    {
      title: "وینڈرز اور کوریئرز کے ساتھ شیئرنگ",
      body: "جب آپ آرڈر دیتے ہیں، متعلقہ وینڈر اور ڈیلیوری کوریئر کو اسے مکمل کرنے کے لیے ضروری معلومات ملتی ہیں — آپ کا نام، فون نمبر، اور ڈیلیوری پتہ۔",
    },
    {
      title: "ڈیٹا اسٹوریج اور سیکیورٹی",
      body: "آپ کا ڈیٹا Supabase کے ساتھ محفوظ کیا جاتا ہے، جو ایک منظم ڈیٹابیس فراہم کنندہ ہے، اور رول بیسڈ رسائی کنٹرولز سے محفوظ ہے تاکہ کسٹمرز، وینڈرز اور KMO اسٹاف صرف اپنے کردار سے متعلقہ ڈیٹا تک رسائی حاصل کر سکیں۔",
    },
    {
      title: "آپ کے اختیارات",
      body: "آپ کسی بھی وقت اپنی پروفائل کی معلومات اپ ڈیٹ کر سکتے ہیں، محفوظ شدہ پتے منظم کر سکتے ہیں، اور ہماری سپورٹ ٹیم سے رابطہ کر کے اکاؤنٹ حذف کرنے کی درخواست دے سکتے ہیں۔",
    },
    { title: "رابطہ", body: "contactSection" },
  ],
};

export function PrivacyContent() {
  const { locale } = useLanguage();
  const c = locale === "ur" ? UR : EN;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>
      <p className="mt-2 text-sm text-muted">{c.lastUpdated}</p>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        {c.sections.map((s) => (
          <div key={s.title}>
            <h2 className="mb-1.5 text-base font-bold text-ink">{s.title}</h2>
            <p>
              {s.body === "contactSection" ? (
                locale === "ur" ? (
                  <>
                    اس پالیسی کے بارے میں سوالات ہمارے{" "}
                    <a href="/contact" className="font-semibold text-primary">
                      {c.contactUs}
                    </a>{" "}
                    پیج کے ذریعے بھیجے جا سکتے ہیں۔
                  </>
                ) : (
                  <>
                    Questions about this policy can be sent through our{" "}
                    <a href="/contact" className="font-semibold text-primary">
                      {c.contactUs}
                    </a>{" "}
                    page.
                  </>
                )
              ) : (
                s.body
              )}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
