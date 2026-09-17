# Database migrations

No DB connection string or Supabase CLI login is available in this environment, so
migrations are plain `.sql` files — apply them yourself:

**Option A — SQL Editor**
Open the [SQL Editor](https://supabase.com/dashboard/project/igjrtfgnlvepemdehbdn/sql/new)
for project `igjrtfgnlvepemdehbdn` and run each file in `migrations/` in order.

**Option B — Supabase CLI**
```
pnpm dlx supabase login
pnpm dlx supabase link --project-ref igjrtfgnlvepemdehbdn
pnpm dlx supabase db push
```

## Applied so far
- `20260915000000_profiles_and_auth.sql` — Module 1: `profiles` table, `user_role`
  enum, RLS policies, and an `on_auth_user_created` trigger that inserts a profile row
  whenever someone signs up.
- `20260915010000_vendors.sql` — Module 2: `vendors` table, `vendor_verification_status`
  enum, RLS (owner read/update, admin full access, public read for approved vendors
  only), and a public `vendor-media` Storage bucket + policies scoped so a vendor can
  only write inside a folder named after their own vendor id (`<vendor_id>/logo.*`,
  `<vendor_id>/cover.*`).
- `20260915020000_catalog.sql` — Module 3: `categories`, `products`, `product_images`,
  `product_variants` tables, RLS (vendor CRUD own products, admin full access, public
  read for published products from approved vendors), a `products.search_vector`
  tsvector column + trigger (powers Module 4's search), and a public `product-media`
  Storage bucket scoped per-product the same way `vendor-media` is scoped per-vendor.
- `20260915030000_cart_and_orders.sql` — Module 5: `addresses`, `cart_items` (owner-only
  RLS), and `orders`/`order_items` (front-loaded minimal shape — no client insert
  policy on purpose, see below). Orders are split **one row per vendor** sharing a
  `checkout_group` id, matching the admin/vendor order tables' single "Vendor" column.

- `20260915040000_seed_categories.sql` — seeds the 13 categories shown in the design
  mockups' "Browse categories" grid, so category pickers/filters aren't empty.
- `20260915050000_order_status_and_commission.sql` — Module 6/9: expands `order_status`
  to the full PRD §11 lifecycle (pending → confirmed → processing → ready_to_ship →
  shipped → out_for_delivery → delivered, plus cancelled/returned), and adds
  `commission_rate`/`commission_amount`/`net_amount`/`payout_id` to `orders` so
  historical orders retain the commission rate that applied at the time of sale.
- `20260915060000_commission_and_payouts.sql` — Module 9: `platform_settings` (singleton
  row: default commission %, delivery zones), per-vendor/per-category commission
  overrides, `vendors.preferred_courier`, and the `payouts` table.
- `20260915070000_reviews_and_wishlist.sql` — Module 7/8: `reviews` (rating, body, vendor
  reply, admin flag/moderation) and `wishlist_items`.
- `20260915080000_returns_and_coupons.sql` — Module 11/12: `returns` (admin-managed, per
  PRD §10 — no vendor write access) and `coupons`.
- `20260915090000_gap_fill.sql` — gap-filling pass: `orders.coupon_code`/`discount_amount`
  (coupons now actually apply at checkout, vendor-scoped); richer `products` fields
  (`brand`, `tags`, `weight_grams`, `low_stock_threshold`, `seo_title`,
  `seo_description` — PRD §5); `audit_logs` (admin actions — PRD §17); `conversations`/
  `messages` (real vendor↔customer chat, replacing the "Messages" placeholder); and
  `contact_messages` (the public Contact page now actually persists submissions,
  publicly insertable but only admin-readable).
- `20260916000000_product_questions.sql` — the PDP's "Ask a question" Q&A thread
  (`Karachi Mart Online - Desktop.html`): `product_questions` (question + vendor
  answer), publicly readable, customer-insertable, vendor-answerable on their own
  products. Wired into the customer PDP and a new "Questions awaiting a reply" panel
  on the vendor Reviews page.
- `20260918000000_vendor_signup_provisioning.sql` — fixes a gap in the vendor app's
  `/signup` form: it collected store info (store name, location, phone) via
  `supabase.auth.signUp()` metadata but nothing ever created the matching
  `public.vendors` row, so `getMyVendor()` returned null forever even after admin
  approval. Extends the existing `handle_new_user()` trigger (already creates the
  `profiles` row) to also insert a `pending` `vendors` row when `role = 'vendor'`,
  generating a unique slug from the store name. Runs server-side as
  `SECURITY DEFINER`, so it works even though email confirmation is ON for this
  project (signUp never returns a live session client-side to insert against).

## Edge Function
- `supabase/functions/place_order` — validates cart stock, creates the per-vendor order
  rows (applying a matching coupon's discount if one was passed), snapshots
  `order_items`, decrements stock, clears the cart. Deploy with:
  ```
  pnpm dlx supabase functions deploy place_order
  ```
  It uses the service-role key (auto-injected as `SUPABASE_SERVICE_ROLE_KEY` by the
  Edge Functions runtime) since `orders`/`order_items` intentionally have no
  client-facing insert policy — this function is the only place order rows get created.

## Manual dashboard configuration required
These aren't reachable via SQL and need to be set in the Supabase dashboard
(Authentication → Providers / Settings) directly:
- **Phone (OTP) provider**: enable it and configure an SMS provider (Twilio, MessageBird,
  or Vonage) under Authentication → Providers → Phone. Without this,
  `supabase.auth.signInWithOtp({ phone })` in the customer app will fail.
- **Email confirmations**: if "Confirm email" is on (default), new signups won't get a
  session until the user clicks the emailed link — the customer signup page already
  handles this (shows a "check your email" screen when `data.session` is null).
