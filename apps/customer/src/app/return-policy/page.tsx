export const metadata = { title: "Return Policy — Karachi Mart Online" };

export default function ReturnPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">Return policy</h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        <Section title="Returns are managed by KMO">
          Unlike some marketplaces, returns on KMO are reviewed and processed by our own team,
          not the individual vendor — so you get a consistent, fair process no matter which
          store you bought from.
        </Section>
        <Section title="How to request a return">
          Open Your Orders, find the delivered item, and submit a return request with a reason.
          Our team reviews each request individually, usually within a few working days.
        </Section>
        <Section title="What happens next">
          If your return is approved, we'll arrange pickup of the item and resolve the request
          through a replacement or store credit. If it's rejected, we'll explain why in your
          account.
        </Section>
        <Section title="No standard monetary refunds">
          KMO does not offer cash refunds as a standard option. Approved returns are resolved
          through replacement or store credit rather than a refund to your original payment
          method.
        </Section>
        <Section title="Items that can't be returned">
          Perishable goods (such as groceries), personal care items that have been opened, and
          made-to-order products are generally not eligible for return unless they arrive
          damaged or significantly different from what was listed.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-base font-bold text-ink">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
