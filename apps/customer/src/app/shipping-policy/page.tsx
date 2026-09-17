export const metadata = { title: "Shipping Policy — Karachi Mart Online" };

export default function ShippingPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        Shipping policy
      </h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        <Section title="Delivery areas">
          KMO delivers across Karachi. Cash on Delivery is available citywide.
        </Section>
        <Section title="Delivery charges">
          Most vendors offer free delivery on orders over Rs. 2,500, with a flat Rs. 120
          delivery charge on smaller orders. Delivery charges are calculated per vendor at
          checkout, since a multi-vendor cart creates a separate order per vendor.
        </Section>
        <Section title="Delivery time">
          Typical delivery within Karachi takes 1–2 working days from when your order is
          confirmed. Some vendors use their own courier and delivery windows — check the
          individual store page for specifics.
        </Section>
        <Section title="Who delivers your order">
          Vendors either manage their own delivery or use a courier partner such as TCS,
          Leopards Courier or M&amp;P Express. Vendors can also opt into KMO-managed shipping
          where available.
        </Section>
        <Section title="Order tracking">
          You can follow your order's status — from confirmed through to delivered — from Your
          Orders in your account.
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
