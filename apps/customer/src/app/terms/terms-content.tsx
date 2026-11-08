"use client";

import { useLanguage } from "@/lib/i18n/language-context";

const EN = {
  badge: "Legal",
  title: "Terms & conditions",
  lastUpdated: "Last updated 7 November 2026",
  returnPolicy: "Exchange Policy",
  contactUs: "Contact us",
  sections: [
    {
      title: "1. About Karachi Mart Online",
      body: (
        <>
          Karachi Mart Online (&ldquo;KMO&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates an
          online marketplace that connects independent vendors in Karachi with customers. KMO is
          a platform operator — products listed on KMO are sold by independent, third-party
          vendors, not by KMO itself, unless stated otherwise.
        </>
      ),
    },
    {
      title: "2. Accounts",
      body: "You must provide accurate information when creating a customer or vendor account and keep your login credentials confidential. You are responsible for activity that happens under your account.",
    },
    {
      title: "3. Vendor listings",
      body: "Vendors are responsible for the accuracy of their product listings, pricing, stock levels and store policies. KMO reviews new vendor accounts and product listings before they go live, but does not guarantee the quality of any specific product.",
    },
    {
      title: "4. Orders and payment",
      body: "KMO currently supports Cash on Delivery (COD) only. By placing an order, you agree to pay the listed total, including any delivery charge, to the delivery rider upon receipt of your order. If you have a KMO wallet balance, you may choose to use it at checkout, and only the remaining amount is paid on delivery.",
    },
    {
      title: "5. Cancellations, exchanges and refunds",
      body: "returnPolicySection",
    },
    {
      title: "6. Vendor fees and payouts",
      body: "Vendors pay KMO a monthly membership fee. Vendor payouts are processed by KMO on a schedule communicated to each vendor.",
    },
    {
      title: "7. Reward points and KMO wallet",
      body: "When KMO runs a reward programme, points are added after an order is delivered and may expire. Points can be converted to KMO wallet cash only after KMO approves the request. Wallet cash can be used at checkout and cannot be withdrawn. KMO may reverse points or wallet cash for cancelled or returned orders, and may change or end the programme at any time.",
    },
    {
      title: "8. Prohibited use",
      body: "You may not use KMO to list or purchase counterfeit, stolen, illegal or unsafe goods, or to misrepresent your identity or a business you do not own or represent.",
    },
    {
      title: "9. Changes to these terms",
      body: "We may update these terms from time to time. Continued use of KMO after changes take effect constitutes acceptance of the revised terms.",
    },
    {
      title: "10. Contact",
      body: "contactSection",
    },
  ],
};

const UR = {
  badge: "قانونی",
  title: "شرائط و ضوابط",
  lastUpdated: "آخری بار اپ ڈیٹ کیا گیا 7 نومبر 2026",
  returnPolicy: "ایکسچینج پالیسی",
  contactUs: "ہم سے رابطہ کریں",
  sections: [
    {
      title: "1. کراچی مارٹ آن لائن کے بارے میں",
      body: (
        <>
          کراچی مارٹ آن لائن (&ldquo;KMO&rdquo;، &ldquo;ہم&rdquo;) ایک آن لائن مارکیٹ پلیس چلاتا
          ہے جو کراچی کے آزاد وینڈرز کو کسٹمرز سے جوڑتا ہے۔ KMO ایک پلیٹ فارم آپریٹر ہے — KMO پر
          درج پراڈکٹس آزاد، تھرڈ پارٹی وینڈرز کی جانب سے فروخت کی جاتی ہیں، جب تک الگ سے نہ بتایا
          جائے، KMO خود سے نہیں۔
        </>
      ),
    },
    {
      title: "2. اکاؤنٹس",
      body: "کسٹمر یا وینڈر اکاؤنٹ بناتے وقت آپ کو درست معلومات فراہم کرنی ہوں گی اور اپنے لاگ ان کی تفصیلات خفیہ رکھنی ہوں گی۔ آپ اپنے اکاؤنٹ کے تحت ہونے والی سرگرمی کے ذمہ دار ہیں۔",
    },
    {
      title: "3. وینڈر لسٹنگز",
      body: "وینڈرز اپنی پراڈکٹ لسٹنگز، قیمتوں، اسٹاک کی سطح اور اسٹور پالیسیوں کی درستگی کے ذمہ دار ہیں۔ KMO نئے وینڈر اکاؤنٹس اور پراڈکٹ لسٹنگز کو لائیو ہونے سے پہلے چیک کرتا ہے، لیکن کسی مخصوص پراڈکٹ کے معیار کی ضمانت نہیں دیتا۔",
    },
    {
      title: "4. آرڈرز اور ادائیگی",
      body: "KMO فی الحال صرف کیش آن ڈیلیوری (COD) سپورٹ کرتا ہے۔ آرڈر دے کر آپ اتفاق کرتے ہیں کہ آرڈر ملنے پر رائیڈر کو درج کل رقم، بشمول کوئی ڈیلیوری چارج، ادا کریں گے۔ اگر آپ کے KMO والیٹ میں رقم ہے تو آپ اسے چیک آؤٹ پر استعمال کر سکتے ہیں، اور باقی رقم ڈیلیوری پر ادا ہوگی۔",
    },
    {
      title: "5. منسوخی، واپسی اور رقم کی واپسی",
      body: "returnPolicySection",
    },
    {
      title: "6. وینڈر فیس اور ادائیگیاں",
      body: "وینڈرز KMO کو ماہانہ ممبرشپ فیس دیتے ہیں۔ وینڈر ادائیگیاں KMO ہر وینڈر کو بتائے گئے شیڈول کے مطابق پروسیس کرتا ہے۔",
    },
    {
      title: "7. ریوارڈ پوائنٹس اور KMO والیٹ",
      body: "جب KMO ریوارڈ پروگرام چلائے، پوائنٹس آرڈر ڈیلیور ہونے کے بعد ملتے ہیں اور ختم بھی ہو سکتے ہیں۔ پوائنٹس KMO کی منظوری کے بعد ہی والیٹ کی رقم میں بدلتے ہیں۔ والیٹ کی رقم چیک آؤٹ پر استعمال ہو سکتی ہے، نکالی نہیں جا سکتی۔ منسوخ یا واپس ہونے والے آرڈرز پر KMO پوائنٹس یا والیٹ کی رقم واپس لے سکتا ہے، اور پروگرام کسی بھی وقت بدل یا بند کر سکتا ہے۔",
    },
    {
      title: "8. ممنوعہ استعمال",
      body: "آپ KMO کو جعلی، چوری شدہ، غیر قانونی یا غیر محفوظ اشیاء درج یا خریدنے کے لیے، یا اپنی شناخت یا کسی ایسے کاروبار کو غلط ظاہر کرنے کے لیے استعمال نہیں کر سکتے جس کے آپ مالک یا نمائندہ نہیں ہیں۔",
    },
    {
      title: "9. ان شرائط میں تبدیلیاں",
      body: "ہم وقتاً فوقتاً ان شرائط کو اپ ڈیٹ کر سکتے ہیں۔ تبدیلیاں لاگو ہونے کے بعد KMO کا استعمال جاری رکھنا نظرثانی شدہ شرائط کی قبولیت شمار ہوگا۔",
    },
    {
      title: "10. رابطہ",
      body: "contactSection",
    },
  ],
};

export function TermsContent() {
  const { locale } = useLanguage();
  const c = locale === "ur" ? UR : EN;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-[13.5px] uppercase tracking-[0.14em] text-muted">{c.badge}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{c.title}</h1>
      <p className="mt-2 text-[15.5px] text-muted">{c.lastUpdated}</p>

      <div className="mt-6 flex flex-col gap-6 text-[15.5px] leading-[1.75] text-ink-dark">
        {c.sections.map((s) => (
          <div key={s.title}>
            <h2 className="mb-1.5 text-[17px] font-bold text-ink">{s.title}</h2>
            <p>
              {s.body === "returnPolicySection" ? (
                locale === "ur" ? (
                  <>
                    KMO پر واپسی نہیں ہوتی۔ صرف ڈیلیوری میں ٹوٹی یا خراب ہوئی چیز KMO بدل دیتا
                    ہے، اور نقد رقم واپس نہیں ہوتی۔ تفصیلات کے لیے ہماری{" "}
                    <a href="/exchange-policy" className="font-semibold text-primary">
                      {c.returnPolicy}
                    </a>{" "}
                    دیکھیں۔
                  </>
                ) : (
                  <>
                    KMO does not accept returns. An item that arrives broken or damaged because
                    of delivery is exchanged by KMO, and no cash refunds are given. See our{" "}
                    <a href="/exchange-policy" className="font-semibold text-primary">
                      {c.returnPolicy}
                    </a>{" "}
                    for details.
                  </>
                )
              ) : s.body === "contactSection" ? (
                locale === "ur" ? (
                  <>
                    ان شرائط کے بارے میں سوالات ہمارے{" "}
                    <a href="/contact" className="font-semibold text-primary">
                      {c.contactUs}
                    </a>{" "}
                    پیج کے ذریعے بھیجے جا سکتے ہیں۔
                  </>
                ) : (
                  <>
                    Questions about these terms can be sent through our{" "}
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
