export const metadata = { title: "Privacy Policy — Karachi Mart Online" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated September 2026</p>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-[1.75] text-ink-dark">
        <Section title="Information we collect">
          When you create an account, we collect your name, phone number, email address and, if
          you place an order, your delivery address. Vendors additionally provide store details
          such as a business name, logo and description.
        </Section>
        <Section title="How we use your information">
          We use your information to process orders, connect you with the vendors you buy from,
          show order status and history, and communicate with you about your account or orders.
          Vendors can see the delivery details needed to fulfil orders you place with them; they
          do not receive your account password or full order history with other vendors.
        </Section>
        <Section title="Sharing with vendors and couriers">
          When you place an order, the relevant vendor and delivery courier receive the
          information needed to fulfil it — your name, phone number, and delivery address.
        </Section>
        <Section title="Data storage and security">
          Your data is stored with Supabase, a managed database provider, and protected using
          role-based access controls so that customers, vendors and KMO staff can only access
          data relevant to their role.
        </Section>
        <Section title="Your choices">
          You can update your profile information, manage saved addresses, and request account
          deletion at any time by contacting our support team.
        </Section>
        <Section title="Contact">
          Questions about this policy can be sent through our{" "}
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
