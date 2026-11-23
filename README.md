# Thanvi Boutique — Operations Platform

One system for a saree retailer that sells through **godowns, physical stores, a website and Instagram**: vendor receiving, per-piece stock tracking with Code 39 barcodes, godown → store transfers, GST billing with Razorpay, a content-managed online storefront, and role-based access for every kind of staff.

Built with **Next.js 15 (App Router) · TypeScript · MongoDB (Mongoose) · Tailwind CSS v4**.

---

## Contents
- [What it does](#what-it-does)
- [Status](#status)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Core concepts](#core-concepts)
- [Roles and permissions](#roles-and-permissions)
- [Storefront and online catalog](#storefront-and-online-catalog)
- [SEO, GEO and AEO](#seo-geo-and-aeo)
- [Razorpay](#razorpay)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Documentation](#documentation)

---

## What it does

| Area | Features |
|---|---|
| **Setup** | Self-serve store/godown wizard, users, editable roles and a permission matrix, SKU and numbering series with a configurable prefix, starting number and padding (live Code 39 preview). |
| **Inventory** | Vendors, goods receipt with product photos, auto SKUs, **one code per physical piece** (`TB1000-001`), Code 39 label printing (50×25 mm), racks/shelves/bins, scan lookup ("where is this piece?"), full piece history, and stock by location and status. |
| **Transfers** | Store requests stock → approval → godown scans to dispatch (**Sent**: debited from the godown, pieces go `in_transit`) → store scans to receive (**Received**: added to store stock). Short and excess pieces are recorded, never silently fixed. |
| **Billing (POS)** | Bill by barcode scan, line and bill discounts, configurable GST engine (HSN rules + price slabs, CGST/SGST vs IGST), immutable GST invoices (A4 and 80 mm thermal), cash/UPI/card, and Razorpay payment links closed by a signed webhook. |
| **Online catalog (CMS)** | *Admin → Online catalog*: photos (drag-and-drop, reorder, cover), title, descriptions, highlights, care, collection, SEO title/description with a Google preview, a publish checklist, and publish/unpublish. Content Editor role. |
| **Storefront** | Public shop at `/shop`: home, shop by fabric, sort, product page with gallery and zoom, a bag drawer, an About page, and micro-interactions, all on Thanvi branding. |
| **Search & AI visibility** | Canonicals, Open Graph, `robots.txt`, dynamic `sitemap.xml` with images, `llms.txt`, schema.org JSON-LD (Organization, ClothingStore, Product, Breadcrumb, CollectionPage, FAQPage), fabric guides and FAQs. |
| **Owner dashboard** | Sales for 7/30/90 days against the previous period, by store, channel (stores, website, Instagram), salesperson, product and payment mode; gross margin (owner only); a 7-day sales forecast; pending payments and live stock. Managers see the same view limited to their own store. |
| **Audit** | Every material action is logged with user, time, reference and before/after. |

## Status

| Phase | Scope | State |
|---|---|---|
| 0 — Foundation | Sign-in, RBAC (data-blind Super Admin), store wizard, users, numbering, audit log | ✅ Done |
| 1 — Inventory | Vendors, receiving, per-piece codes, labels, bins, scan lookup, transfers | ✅ Done |
| 2 — POS & billing | Scan billing, discounts, GST engine, invoices, Razorpay links + webhook | ✅ Framework done |
| 3 — Storefront | Online catalog CMS, public shop, bag, SEO/GEO/AEO | 🚧 In progress (checkout not connected yet) |
| 4 — People & analytics | Owner dashboard and forecast ✅ · vendor bills and payments, staff, attendance, salary and incentives ⏳ | 🚧 In progress |
| 5 — Extras | Vendor portal, stitching, rental, notifications | ⏳ Planned |

What's next, and what's needed from the client: [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript (strict) |
| Database | MongoDB Atlas (replica set needed for transactions) via Mongoose 9 |
| Validation | Zod v4 at every API boundary |
| Auth | Email + password (bcrypt), signed JWT session cookie (`jose`), route guard in `src/middleware.ts` |
| Styling | Tailwind CSS v4 + design tokens in `src/app/globals.css`, Cabin and IBM Plex Mono fonts |
| Barcodes | `bwip-js` (Code 39) |
| Files | Product photos in MongoDB GridFS (moving to S3/R2 later) |
| Payments | Razorpay payment links + HMAC-verified webhook |
| Tests | Vitest + `mongodb-memory-server`, Playwright E2E |

## Getting started

**Prerequisites:** Node.js 20+, npm, and a MongoDB Atlas cluster (or any MongoDB **replica set**; a standalone server can't run transactions).

```bash
git clone https://github.com/Edwinswanith/ecommers_crm.git
cd ecommers_crm
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run seed                    # default roles, locations, number series, first Super Admin + Owner
npm run seed:demo               # optional: 28 demo sarees published on the storefront
npm run dev                     # http://localhost:3000
```

- `http://localhost:3000` → redirects to the shop (`/shop`)
- `http://localhost:3000/admin` → back office (sign in with the `SEED_*` logins)

`npm run seed` is idempotent and also runs pending data migrations (`src/server/seed/migrations.ts`), so re-run it after pulling changes.

## Environment variables

All secrets live in `.env.local`, which is git-ignored. `.env.example` lists every key.

| Key | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas connection string |
| `MONGODB_DB` | ✅ | Database name (e.g. `thanvi_boutique`) |
| `AUTH_SECRET` | ✅ | Session signing key: `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | ✅ in production | Live domain; drives canonicals, sitemap, JSON-LD and `llms.txt` |
| `SEED_SUPERADMIN_EMAIL` / `_PASSWORD` | for `npm run seed` | First Super Admin login |
| `SEED_OWNER_EMAIL` / `_PASSWORD` | for `npm run seed` | First Owner login |
| `SEED_DEMO_PASSWORD` | optional | Shared password for the sample logins made by `npm run seed:demo` |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | for online payments | Razorpay API and webhook |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit + integration tests (in-memory MongoDB; never touches Atlas) |
| `npm run test:coverage` | Same, with a coverage report |
| `npm run test:e2e` | Playwright against a production build on port 3100 and a separate `thanvi_boutique_e2e` database |
| `npm run seed` | Roles, locations, numbering, first users, migrations |
| `npm run seed:demo` | Load 28 demo sarees, 90 days of sample sales (`DEMO-` invoices) and, if `SEED_DEMO_PASSWORD` is set, one sample login per role (`demo-owner@thanvi.test`, `demo-head@`, `demo-store@`, `demo-web@`, `demo-sales@`, `demo-godown@`, `demo-content@`). `npm run seed:demo -- --remove` removes all of it |

## Project structure

```
src/
├── app/
│   ├── admin/            Back office: inventory, transfers, billing, catalog, settings
│   ├── api/              Route handlers (thin; call services through withGuard)
│   ├── shop/             Public storefront (home, sarees, product, bag, about)
│   ├── login/            Sign-in
│   ├── robots.ts  sitemap.ts  llms.txt/   Crawler and AI-agent endpoints
├── components/
│   ├── admin/            Back-office UI (catalog editor, tables, forms)
│   ├── shop/             Storefront UI (cards, gallery, bag drawer, motion)
│   ├── invoice/          Invoice layouts (A4 + thermal)
│   └── seo/              JSON-LD and visible FAQ components
├── lib/
│   ├── rbac/             Permission registry and checks
│   ├── gst/              Pure GST engine shared by POS preview and server
│   ├── storefront/       Collections, publish checklist, bag logic
│   ├── seo/              Site facts, JSON-LD builders, fabric guides
│   ├── validation/       Zod schemas
│   └── money.ts code39.ts api.ts http.ts db.ts env.ts
├── models/               Mongoose models (Item, Product, Transfer, Invoice, WebListing, …)
├── server/
│   ├── services/         Business rules, transactions, location scoping, audit
│   └── seed/             Default roles/locations, migrations, demo catalog
└── middleware.ts         Guards /admin
tests/                    Vitest unit + integration
e2e/                      Playwright specs
scripts/                  seed.ts, seed-demo-catalog.ts
seed-assets/              Demo saree photos (seed only, not served from public/)
docs/                     Requirements, architecture, guides
```

Request flow: `app/api/**/route.ts` → `withGuard('<module>.<action>')` → `server/services/*` → `models/*`. Every API returns `{ success, data, error, meta? }`.

## Core concepts

- **Item-level stock is the only truth.** Each physical saree is one `items` document with a unique code. Counts are always derived (`locationId + status`); there is no editable quantity field.
- **Piece statuses:** `available`, `reserved`, `in_transit`, `sold`, `rented`, `stitching`, `damaged`, `returned`.
- **Every status change is conditional and transactional:** `updateOne({ _id, status: expected })` inside a MongoDB transaction, plus a `stockMovements` ledger row and an audit log row. This is what makes double billing or double dispatch impossible.
- **Codes:** every number (SKU, vendor, transfer, invoice per store) comes from an atomic `$inc` number series. Item code = `<SKU>-<NNN>`. Barcodes use Code 39 (`A–Z 0–9 - . $ / + %` and space).
- **Locations** are data, not code: `type: godown | store | online`, created through *Settings → Stores*.
- **Money** is stored as integer paise everywhere.
- **GST** is computed on the post-discount taxable value from configurable tax rules (longest HSN prefix wins, per-piece price slabs). Rates need CA sign-off.
- **Invoices are immutable:** lines, totals and a seller snapshot are frozen at billing time. Cash/UPI/card closes immediately; Razorpay invoices stay `open` (pieces `reserved`) until the signed webhook confirms payment.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roles and permissions

Permissions are `<module>.<action>` (actions: `view create edit delete approve export`), registered in `src/lib/rbac/permissions.ts`. The server guard is the security boundary; the UI only hides buttons.

| Role | Scope |
|---|---|
| **Super Admin** | System setup only (roles, users, stores, numbering). **Data-blind:** can never see sales, stock or financials, even if a data permission is added in the database. |
| **Owner** | Everything, including cost price, margins and all locations |
| **Manager Head** | Stock, sales, staff and approvals across assigned stores |
| **Manager** | Own store: inventory, stock requests, staff |
| **Salesperson** | POS billing and stock lookup at own store |
| **Godown Staff** | Receiving, labels, dispatch at assigned godown |
| **Content Editor** | Online catalog only (photos, copy, SEO, publishing) |
| **Vendor** | Own deliveries (portal planned) |

Users without "all locations" only ever see their assigned locations; this is enforced in the service queries. Confidential fields (cost, margin) are stripped server-side unless the role allows them.

## Dashboard and forecast

The home page (`/admin`) adapts to the person signed in:

- **Owner / Manager Head:** the business overview across all stores and online.
- **Manager:** the same overview, limited to their own store (enforced in the query).
- **Salesperson, Godown Staff, Content Editor:** shortcuts to the jobs their role covers.
- **Super Admin:** the setup desk. No business figures, and the analytics API returns 403.

Only closed or paid invoices count as sales. Days are bucketed in Indian time. Gross margin is shown only to roles with the confidential flag, and only for sales whose product has a cost price.

The forecast (`src/lib/analytics/forecast.ts`) is deliberately simple: for each weekday it averages the last six same weekdays (recent weeks weigh more), adjusts by the recent two-week trend (half-applied, capped), and shows a likely range. It needs about two weeks of billing to pick up the weekly pattern and eight weeks for full confidence.

## Storefront and online catalog

- Web content is a `WebListing` (one per product) edited in *Admin → Online catalog*. **Price always comes from the product's MRP**, never from the listing.
- The storefront reads **only published listings** and never exposes SKU, cost, vendor or stock data.
- Photos: admins preview through `/api/catalog/photos/[id]`; the public `/api/media/[id]` serves a photo only while a published listing uses it.
- A listing can only be published once its checklist passes (photos, title, description length, collection, SEO fields).
- Client guide for content editors: [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).

## SEO, GEO and AEO

- **SEO:** server-rendered pages, unique titles and descriptions, sort-free canonicals, `en-IN`, Open Graph, real 404s, `noindex` on bag/login/admin, and `/` → `/shop` (308).
- **Crawl:** `robots.txt` allows search and AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Bingbot…), and a dynamic `sitemap.xml` with image entries.
- **GEO:** `/llms.txt` is a live markdown summary of the business, fabrics and every published saree.
- **AEO:** fabric guides with FAQs and per-product FAQs, visible on the page and mirrored in `FAQPage` JSON-LD.

Configuration and the client checklist (Search Console, Bing Webmaster, Google Business Profiles): [docs/SEO.md](docs/SEO.md).

## Razorpay

1. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env.local`.
2. In the Razorpay dashboard, add a webhook to `https://<your-domain>/api/webhooks/razorpay` for the `payment_link.paid` event.
3. Only the signature-verified webhook marks an invoice paid; the handler is idempotent on `razorpay_payment_id`.

## Testing

```bash
npm run lint && npm run typecheck
npm test               # Vitest: unit + integration
npm run test:coverage
npm run test:e2e       # Playwright
```

- Integration tests run against an in-memory MongoDB replica set (`tests/setup/db.ts`), never Atlas.
- E2E runs `next build && next start` on port 3100 against `thanvi_boutique_e2e`, which is reset each run. It covers setup, inventory → billing, the storefront, the catalog editor and SEO endpoints.
- Target: 80%+ coverage on `src/lib` and `src/server`.

## Deployment

Recommended: **Vercel + MongoDB Atlas**.

1. Import the repository in Vercel.
2. Add the environment variables from the table above, including `NEXT_PUBLIC_SITE_URL` set to the live domain.
3. In Atlas, allow Vercel's egress (or `0.0.0.0/0` with a strong password) and enable backups.
4. Run `npm run seed` once against the production database.
5. Before launch: remove the demo sarees (`npm run seed:demo -- --remove`), fill in store details in `src/lib/seo/site.ts`, and submit `/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

## Security

- Secrets only in environment variables; never commit `.env.local`.
- Passwords are hashed with bcrypt; sessions are signed, HTTP-only cookies.
- Every write is validated with Zod, guarded by permission, location-scoped and audited.
- Login attempts are rate-limited (in-memory today; move to Redis when running several instances).
- Razorpay webhooks are HMAC-verified and idempotent.

## Documentation

| Doc | What's in it |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Business requirements and open client questions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, data model, stock state machine, RBAC |
| [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) | How content editors add photos, copy and SEO |
| [docs/SEO.md](docs/SEO.md) | Search and AI visibility, client checklist |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | Roadmap and items needed from the client |
| [.claude/skills/thanvi-boutique/SKILL.md](.claude/skills/thanvi-boutique/SKILL.md) | Project rules for AI-assisted development |

---

Private project for Thanvi Boutique. All rights reserved.
