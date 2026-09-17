# Karachi Mart Online (KMO)

A multi-vendor e-commerce marketplace for Karachi — customers browse and buy from
independent local vendors, vendors run their own storefront/dashboard, and a super
admin oversees the whole platform. Built as a pnpm + Turborepo monorepo with Supabase
as the backend.

Design source: the four mockups in `/Designs` —
`Desktop.html`, `Karachi Mart Online - Mobile (1).html`, `Super Admin Dashboard.html`,
`Vendor-store Dashboard.html`. A full design audit lives in
`/design-reference/NOTES.md`.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Customer app | Next.js 16 (App Router, Turbopack) |
| Vendor & Admin apps | Vite 8 + React 19 |
| Styling | Tailwind CSS v4 (`@theme`), shadcn/ui (Base UI/Radix "Nova" preset) |
| Shared code | `packages/shared` — types, Supabase client, API functions, UI components, theme tokens, auth context |
| Data fetching | TanStack Query, everywhere |
| Backend | Supabase (Postgres, Auth, Row Level Security, Storage, Edge Functions) |
| Language | TypeScript throughout |

---

## 2. Monorepo layout

```
KMO-Project/
├─ apps/
│  ├─ customer/     Next.js storefront (customers)          → localhost:3000
│  ├─ vendor/        Vite+React vendor dashboard              → localhost:5174
│  └─ admin/         Vite+React super admin dashboard         → localhost:5175
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ api/       one file per domain (vendors, products, orders, payouts,
│        │              reviews, coupons, returns, wishlist, admin-stats, ...)
│        ├─ auth/       AuthProvider / useAuth / useAuthGuard (role-based)
│        ├─ theme/      tokens.css (Tailwind v4 @theme) + tokens.ts (JS mirror)
│        ├─ types/      database.ts — hand-written Supabase Database type
│        └─ ui/         shared components (Button, Input, AuthLayout, DashboardShell,
│                        PillTabs, StatusBadge, ProductCard, ...)
├─ supabase/
│  ├─ migrations/       one .sql file per module, applied manually (no CLI link)
│  ├─ functions/        place_order Edge Function
│  ├─ ALL_MIGRATIONS_COMBINED.sql   (regenerate after adding a migration)
│  └─ README.md         migration log + manual dashboard steps
├─ design-reference/
│  └─ NOTES.md           full design-fidelity audit of all 4 mockups
└─ PROJECT.md            this file
```

---

## 3. Running the project

```powershell
cd E:\Karachi-Mart\KMO-Project

# install once
pnpm install

# run all three apps together
pnpm dev

# or run one at a time
pnpm --filter @kmo/customer dev   # http://localhost:3000
pnpm --filter @kmo/vendor dev     # http://localhost:5174
pnpm --filter @kmo/admin dev      # http://localhost:5175
```

Other root scripts: `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm clean`.

### Supabase project
- URL: `https://igjrtfgnlvepemdehbdn.supabase.co`
- Migrations are plain `.sql` files (no CLI link in this environment) — apply new
  ones via the [SQL Editor](https://supabase.com/dashboard/project/igjrtfgnlvepemdehbdn/sql/new),
  or combine and paste `supabase/ALL_MIGRATIONS_COMBINED.sql` for a fresh project.
- See `supabase/README.md` for the full migration log, the `place_order` Edge
  Function, and manual dashboard steps (Phone OTP provider, email confirmations).

---

## 4. Test / demo accounts

| Role | Email | Password |
|---|---|---|
| Super admin | `karachimartonline12@yopmail.com` | `Guddaisbest#110` |
| Vendor — Tariq Road Electronics | `tariqroad.seed@karachimart.pk` | `Seed1234!` |
| Vendor — Zainab Market Threads | `zainabmarket.seed@karachimart.pk` | `Seed1234!` |
| Vendor — Empress Market Grocers | `empressmarket.seed@karachimart.pk` | `Seed1234!` |
| Vendor — Saddar Watch House | `saddarwatch.seed@karachimart.pk` | `Seed1234!` |
| Vendor — Bahadurabad Toys (pending approval, for demo) | `bahadurabadtoys.seed@karachimart.pk` | `Seed1234!` |
| Demo customers (5) | `sara.a.seed@…`, `bilal.k.seed@…`, `nida.m.seed@…`, `asad.h.seed@…`, `mehak.z.seed@…` (`@karachimart.pk`) | `Seed1234!` |

Demo data seeded: 4 approved vendors + 14 published products (with category-matched
placeholder art), 1 pending vendor + 1 pending product (for the admin "Pending
approvals" demo), 5 customers with addresses, and 42 orders spread across the last 35
days (feeds the GMV chart, top-categories breakdown and stat tiles).

---

## 5. Design system (shared tokens)

Defined in `packages/shared/src/theme/tokens.css`, consumed by all three apps via
`@import "@kmo/shared/theme/tokens.css"` before `@import "tailwindcss"`.

| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#4A2266` | Plum — nav, links, secondary buttons |
| `--color-accent` | `#C4552F` | Terracotta — primary CTAs |
| `--color-bg` | `#EDE9F2` | Page background |
| `--color-sidebar-bg` | `#2B1638` | Admin/vendor dashboard sidebar |
| `--color-border` | `#EADFDA` | Card/input borders |
| `--color-success` / `-warning` / `-danger` | `#2E7A4F` / `#B06A0E` / `#8F3A1E` | Status badges |

Fonts: **Plus Jakarta Sans** (UI/body) + **IBM Plex Mono** (uppercase eyebrow labels,
table headers). Flat, 1px-bordered aesthetic — essentially no box-shadows anywhere,
matching the source mockups.

> **Important gotcha (already fixed, keep in mind for new apps):** each app's
> `index.css`/`globals.css` needs an explicit
> `@source "../../../packages/shared/src";` line. Without it, Tailwind v4's
> content scanner never sees classes used only inside `packages/shared` (a
> workspace package resolved through `node_modules`), so shared components like
> `DashboardShell`'s sidebar silently render with no background/text-color rules.

---

## 6. What's built (by module)

1. **Auth & roles** — email/password + phone OTP (customer), email/password
   (vendor/admin); `profiles.role` = `customer | vendor | admin`; `RequireAuth` +
   `useAuthGuard` gate every protected route per app.
2. **Vendor & store management** — apply-to-sell, admin approve/reject, store
   profile (logo/cover/hours/policies/vacation mode), storefront page.
3. **Catalog** — categories, products, images, variants; vendor CRUD, admin
   moderation, public search (Postgres `tsvector`).
4. **Search & browse** — homepage, category browse, search with filters.
5. **Cart & checkout** — per-vendor cart grouping, addresses, coupons, the
   `place_order` Edge Function (stock validation, order snapshot, cart clear).
6. **Order lifecycle** — full PRD §11 status flow (pending → … → delivered /
   cancelled / returned) across customer, vendor and admin views.
7. **Reviews** — ratings, vendor replies, admin flag/moderation.
8. **Wishlist**.
9. **Commission & payouts** — per-vendor/category commission overrides, admin
   payout table with "Pay now", vendor payout history + withdrawal requests.
10. **Admin dashboard** — Overview (stat tiles, GMV trend chart, top categories,
    pending approvals with live Approve/Reject), Vendors/Orders/Products/
    Customers/Payouts/Categories tables, Reviews moderation, Settings.
11. **Vendor dashboard** — Overview, Products, Orders, Payments, Coupons,
    Shipping, Sales report, Store settings, Reviews & Q&A, Messages.
12. **Returns, coupons, audit logs, contact form, product Q&A, vendor↔customer
    messaging** — gap-fill pass, all backed by real tables (not placeholders).
13. **SEO** — `generateMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD on the
    customer app.
14. **Responsive design** — customer app reworked for the 390px mobile mockup
    (header location indicator, storefront vacation/hours/chat sections,
    cart line-item layout, PDP action-button row all reflow instead of
    disappearing below `sm:`/`md:`).

---

## 7. Known gaps / things to revisit

- Phone OTP requires an SMS provider (Twilio/MessageBird/Vonage) configured
  manually in the Supabase dashboard — not wired to any provider yet.
- `place_order` Edge Function needs `pnpm dlx supabase functions deploy place_order`
  run once per environment (uses the service-role key, auto-injected at runtime).
- No automated test suite yet (manual QA against the mockups only).
- Git is not initialised in this project directory.
