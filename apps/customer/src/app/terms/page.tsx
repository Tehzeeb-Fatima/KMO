export const metadata = { title: "Terms & Conditions — Karachi Mart Online" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        Terms &amp; conditions
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated September 2026</p>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        <Section title="1. About Karachi Mart Online">
          Karachi Mart Online (&ldquo;KMO&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates an online
          marketplace that connects independent vendors in Karachi with customers. KMO is a
          platform operator — products listed on KMO are sold by independent, third-party
          vendors, not by KMO itself, unless stated otherwise.
        </Section>
        <Section title="2. Accounts">
          You must provide accurate information when creating a customer or vendor account and
          keep your login credentials confidential. You are responsible for activity that
          happens under your account.
        </Section>
        <Section title="3. Vendor listings">
          Vendors are responsible for the accuracy of their product listings, pricing, stock
          levels and store policies. KMO reviews new vendor accounts and product listings before
          they go live, but does not guarantee the quality of any specific product.
        </Section>
        <Section title="4. Orders and payment">
          KMO currently supports Cash on Delivery (COD) only. By placing an order, you agree to
          pay the listed total, including any delivery charge, to the delivery rider upon
          receipt of your order.
        </Section>
        <Section title="5. Cancellations, returns and refunds">
          Returns are managed directly by KMO rather than by individual vendors — see our{" "}
          <a href="/return-policy" className="font-semibold text-primary">
            Return Policy
          </a>{" "}
          for details. KMO does not offer standard monetary refunds; approved returns are
          resolved through replacement or store credit.
        </Section>
        <Section title="6. Commission and vendor payouts">
          KMO charges vendors a commission on completed sales, which may vary by vendor or
          category. Vendor payouts are processed manually by KMO on a schedule communicated to
          each vendor.
        </Section>
        <Section title="7. Prohibited use">
          You may not use KMO to list or purchase counterfeit, stolen, illegal or unsafe goods,
          or to misrepresent your identity or a business you do not own or represent.
        </Section>
        <Section title="8. Changes to these terms">
          We may update these terms from time to time. Continued use of KMO after changes take
          effect constitutes acceptance of the revised terms.
        </Section>
        <Section title="9. Contact">
          Questions about these terms can be sent through our{" "}
          <a href="/contact" className="font-semibold text-primary">
            Contact us
          </a>{" "}
          page.
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
