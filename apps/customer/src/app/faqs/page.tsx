export const metadata = { title: "FAQs — Karachi Mart Online" };

const FAQS = [
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
];

export default function FaqsPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Support</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        Frequently asked questions
      </h1>

      <div className="mt-6 flex flex-col gap-4">
        {FAQS.map((item) => (
          <div key={item.q} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[15px] font-bold text-ink">{item.q}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-dark">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
