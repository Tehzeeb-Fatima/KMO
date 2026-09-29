-- Business model change per the KMO Vendor Rule Book:
--   1. KMO stops charging vendors commission on sales (was a % of subtotal).
--   2. Vendors instead pay a flat monthly membership fee, free for the first
--      couple of months from their signup date.
--   3. A promotion can only be funded entirely by KMO or entirely by the
--      vendor — the earlier "shared" 50/50 split option is removed.
--   4. The rule book itself becomes an admin-editable page (no more hardcoded
--      per-app copy), following the existing platform_settings pattern.

-- ── 1. commission -> 0 ──────────────────────────────────────────────────────
update public.platform_settings set default_commission_rate = 0;
update public.vendors set commission_rate = 0 where commission_rate is not null;
alter table public.vendors alter column commission_rate set default 0;

-- ── 2. vendor membership ────────────────────────────────────────────────────
alter table public.platform_settings
  add column if not exists vendor_membership_fee numeric(10, 2) not null default 499,
  add column if not exists vendor_free_trial_months integer not null default 2,
  add column if not exists vendor_agreement_title text not null default 'Vendor Rule Book & Seller Guidelines',
  add column if not exists vendor_agreement_body text not null default '';

alter table public.vendors
  add column if not exists membership_started_at timestamptz not null default now();

-- Existing vendors keep their original signup date as their trial start,
-- rather than getting a fresh free-trial window from today.
update public.vendors set membership_started_at = created_at;

create table if not exists public.vendor_membership_charges (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  amount numeric(10, 2) not null,
  status text not null default 'due' check (status in ('due', 'paid', 'waived')),
  paid_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint vendor_membership_charges_period_check check (period_end > period_start)
);

create index if not exists vendor_membership_charges_vendor_idx
  on public.vendor_membership_charges (vendor_id, period_start desc);

alter table public.vendor_membership_charges enable row level security;

drop policy if exists "vendor_membership_charges_admin_all" on public.vendor_membership_charges;
create policy "vendor_membership_charges_admin_all"
  on public.vendor_membership_charges for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "vendor_membership_charges_vendor_select" on public.vendor_membership_charges;
create policy "vendor_membership_charges_vendor_select"
  on public.vendor_membership_charges for select
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_membership_charges.vendor_id and v.owner_id = auth.uid()
    )
  );

-- ── 3. promotions: drop the co-funded "shared" option ───────────────────────
alter table public.promotions drop constraint if exists promotions_funded_percent_consistency;
alter table public.promotions drop constraint if exists promotions_funded_by_check;
update public.promotions set funded_by = 'vendor', vendor_funded_percent = 100 where funded_by = 'shared';
alter table public.promotions
  add constraint promotions_funded_by_check check (funded_by in ('kmo', 'vendor'));
alter table public.promotions
  add constraint promotions_funded_percent_consistency check (
    (funded_by = 'kmo' and vendor_funded_percent = 0)
    or (funded_by = 'vendor' and vendor_funded_percent = 100)
  );

-- ── 4. seed the vendor agreement body ───────────────────────────────────────
update public.platform_settings set vendor_agreement_body = $vendor_agreement$Assalam-o-Alaikum!

Welcome to Karachi Mart Online (KMO) — a marketplace created to help local businesses, home-based entrepreneurs, and women-led businesses showcase and sell their products online.

Please read the following rules and guidelines before joining KMO as a vendor.

# 1. Vendor Registration & Membership

- Vendor registration is FREE for the first 2 months.
- After the initial 2 months, the monthly membership fee will be Rs. 499 per month.
- No registration fee will be charged during the free period.
- Vendors must provide accurate business, contact, and payment details.
- Membership fees are non-refundable once the paid membership period begins.

# 2. Product Listing & Pricing

- Vendors are responsible for uploading accurate product details, prices, descriptions, and clear product images.
- Product prices must be final and transparent.
- Vendors must keep their inventory updated to avoid accepting orders for out-of-stock products.
- Any changes in product pricing or availability must be updated promptly.
- Vendors are responsible for ensuring that their products meet applicable quality and legal requirements.

# 3. Orders & Order Management

- Vendors must regularly check their vendor dashboard for new orders.
- Orders must be processed and prepared within the agreed dispatch timeline.
- Vendors must inform KMO promptly about any delays, stock issues, or order-related problems.
- Repeated cancellations or failure to fulfil confirmed orders may result in account suspension.

# 4. Payments & Vendor Payouts

- KMO currently supports Cash on Delivery (COD).
- Vendor payouts will be processed MONTHLY.
- Payments will be calculated based on successfully delivered and eligible orders.
- Cancelled, undelivered, or returned orders will not qualify for payout.
- Any applicable delivery charges, approved adjustments, or outstanding membership fees will be reflected in the vendor's settlement statement.
- Vendors must provide accurate bank account or payment details to receive their payouts.

# 5. KMO Commission Policy

- KMO will NOT charge any commission on vendor sales.
- Vendors retain the full product sale amount, subject to applicable adjustments and the agreed payment and delivery arrangements.
- The only standard platform fee after the free period is the monthly membership fee of Rs. 499.

Example: Product selling price Rs. 1,000 — KMO commission Rs. 0 — Vendor's product sale amount Rs. 1,000.

# 6. Discounts & Promotional Campaigns

There are two types of promotions on KMO.

Vendor-Funded Discounts:
- Vendors may independently offer discounts on their products.
- Vendors decide their own sale prices and discount percentages.
- The vendor bears the cost of their own discount.
- Vendors must update the correct sale price and regular price on the platform.

Example: Regular price Rs. 1,000, vendor discount 20% — customer pays Rs. 800 — vendor sale amount Rs. 800.

KMO-Funded Promotions:
- KMO may offer promotional coupons or discounts to attract customers.
- KMO-funded discounts will be borne by KMO and will not be deducted from the vendor's agreed product sale amount.
- Vendors will receive their full listed product price for eligible orders, subject to the applicable settlement terms.
- KMO will determine the eligibility, duration, and limits of its promotional campaigns.

Example: Product price Rs. 1,000, KMO-funded discount Rs. 200 — customer pays Rs. 800 — vendor receives Rs. 1,000.

Important: KMO and vendor discounts will not be shared or combined as a co-funded discount. Each promotion is funded entirely by the party offering it.

# 7. Shipping & Delivery

- Shipping can be managed either by the vendor or by KMO, depending on the agreed arrangement.
- The responsible party must ensure timely dispatch and delivery.
- Delivery charges will be communicated to the customer before order confirmation.
- Vendors must package products securely and ensure they are ready for dispatch.
- Vendors must cooperate with KMO regarding delivery updates and customer queries.

# 8. Returns & Customer Complaints

- KMO will manage the customer return process in accordance with its return policy.
- Vendors must cooperate with KMO in resolving product-related complaints.
- Vendors are responsible for ensuring that products match their descriptions and are delivered in the promised condition.
- No refunds will be offered under the standard KMO policy, subject to applicable legal requirements and any specific policy exceptions communicated by KMO.
- Return-related adjustments, where applicable, will be reflected in the relevant vendor settlement.

# 9. Vendor Conduct & Account Management

- Vendors must maintain professional communication with KMO and customers.
- Misleading product information, counterfeit products, or unauthorised use of images or content is not permitted.
- Vendors must not share customer information or use it for unauthorised marketing.
- KMO reserves the right to suspend or remove vendor accounts for repeated policy violations, fraudulent activity, or failure to fulfil obligations.
- KMO may update its policies with prior communication to registered vendors.

# 10. Vendor Support

KMO aims to provide vendors with a platform to showcase their products, manage inventory and orders, and reach more customers.

For registration, dashboard assistance, order issues, or membership queries, please contact the KMO team through the official vendor support channel.

Thank you for becoming a part of Karachi Mart Online.

Karachi Mart Online (KMO)
Your Marketplace. Your Business. Your Growth.$vendor_agreement$
where id = true;
