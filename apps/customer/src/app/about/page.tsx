export const metadata = { title: "About KMO — Karachi Mart Online" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">About us</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        About Karachi Mart Online
      </h1>

      <div className="mt-6 flex flex-col gap-5 text-[15px] leading-[1.75] text-ink-dark">
        <p>
          Karachi Mart Online (KMO) is a local marketplace built for Karachi&rsquo;s shopkeepers,
          home-based sellers and independent brands to reach customers online without having
          to build and run their own website.
        </p>
        <p>
          We started KMO because most marketplace platforms are built for large sellers with
          warehouses and logistics teams — not for the tailor in Tariq Road, the home baker in
          Gulshan, or the jewellery maker working out of a spare room in Nazimabad. KMO gives
          every one of these sellers their own storefront, order management tools simple enough
          to use on a phone, and access to customers across the city.
        </p>
        <p>
          A large share of the sellers on KMO are women-led and home-based businesses — people
          who often can&rsquo;t invest in a shop-front or a developer, but who make products
          Karachi already wants to buy. We built KMO to make that easier, not to compete with
          it.
        </p>
        <p>
          For customers, KMO combines the convenience of browsing many stores in one place with
          the reassurance of cash on delivery — you only pay once your order is in your hands.
        </p>
      </div>
    </main>
  );
}
