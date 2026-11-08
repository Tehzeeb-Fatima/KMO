"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Legal",
  title: "Exchange policy",
  sections: [
    {
      title: "No returns",
      body: "KMO does not accept returns for change of mind, size, colour or any other reason, except the one case below.",
    },
    {
      title: "Items broken or damaged in delivery",
      body: "If an item arrives broken or damaged because of delivery, KMO will exchange it. This is the only case in which an item can be sent back.",
    },
    {
      title: "How to request an exchange",
      body: "Open Your Orders, find the delivered item and submit a request with the reason, or contact the KMO team. The KMO team reviews each request and arranges the exchange once it is approved.",
    },
    {
      title: "No cash refunds",
      body: "KMO does not give cash refunds. An approved request is resolved by exchanging the item.",
    },
  ],
};

const UR = {
  badge: "قانونی",
  title: "ایکسچینج پالیسی",
  sections: [
    {
      title: "واپسی نہیں ہوتی",
      body: "KMO پر ارادہ بدلنے، سائز، رنگ یا کسی اور وجہ سے واپسی نہیں ہوتی، سوائے نیچے دیے گئے ایک کیس کے۔",
    },
    {
      title: "ڈیلیوری میں ٹوٹی یا خراب ہوئی چیز",
      body: "اگر کوئی چیز ڈیلیوری کی وجہ سے ٹوٹی ہوئی یا خراب پہنچے، تو KMO اسے بدل دے گا۔ صرف اسی صورت میں چیز واپس بھیجی جا سکتی ہے۔",
    },
    {
      title: "ایکسچینج کی درخواست کیسے دیں",
      body: "Your Orders کھولیں، ڈیلیور شدہ چیز چنیں اور وجہ کے ساتھ درخواست جمع کریں، یا KMO ٹیم سے رابطہ کریں۔ KMO ٹیم ہر درخواست دیکھتی ہے اور منظوری کے بعد ایکسچینج کا انتظام کرتی ہے۔",
    },
    {
      title: "نقد رقم واپس نہیں ہوتی",
      body: "KMO نقد رقم واپس نہیں کرتا۔ منظور شدہ درخواست چیز بدل کر حل کی جاتی ہے۔",
    },
  ],
};

export function ExchangePolicyContent() {
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
