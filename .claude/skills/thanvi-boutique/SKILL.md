---
name: thanvi-boutique
description: Domain rules, architecture and conventions for the Thanvi Boutique platform (saree retail inventory, POS/billing, GST, Razorpay, e-commerce, Instagram orders, godown-to-store transfers, roles and permissions, staff and incentives). Use for ANY work in this repository — adding a module, model, API route, page or test, or answering questions about how the business flows work.
---

# Thanvi Boutique platform

Read `docs/REQUIREMENTS.md` (what the business needs) and `docs/ARCHITECTURE.md` (how it is built) before making non-trivial changes. This skill is the short version: the rules that must never be broken.

## Business in one paragraph
A saree retailer with **godowns** (Godown 1 receives from vendors, Godown 2 distributes), **stores** (4 today, more added by the client themselves) and **online channels** (website + Instagram orders entered by staff). Vendors supply stock. Every physical piece gets a unique code and is tracked from vendor receipt to sale.

## Non-negotiable invariants
1. **Item-level stock is the only truth.** One `items` document per physical piece. Stock counts are always *derived* (`countDocuments({locationId, status})`); never store an editable quantity.
2. **Every status change is conditional and transactional:** `updateOne({ _id, status: expected }, …)` inside `session.withTransaction`, plus a `stockMovements` row and an `auditLogs` row. If `matchedCount === 0`, abort. This is what prevents double billing and double dispatch.
3. **Transfers:** marking **Sent** moves items `available → in_transit` (debited from source). Marking **Received** (by scan) moves `in_transit → available` at the destination. Record short and excess quantities, and never silently fix them.
4. **Sales:** finalising an invoice moves items to `sold` in the same transaction. Online and Instagram orders hold items as `reserved` until payment.
5. **Razorpay:** only a signature-verified webhook marks a payment captured. Handlers are idempotent on `razorpay_payment_id`. Invoice `open → paid → closed`. Never trust the client's "payment success" callback alone.
6. **GST** is computed on the post-discount taxable value from configurable `taxRules` (HSN + price slab). Never hardcode rates. Rules need CA sign-off.

## Roles and permissions
- Permission string = `<module>.<action>`; actions: `view create edit delete approve export`. Registry: `src/lib/rbac/permissions.ts`. Add new modules there first.
- **Super Admin is data-blind.** Its role is `isSystem: true` and holds only `system.*` permissions (roles, users, locations, numbering). `hasPermission` refuses data permissions for system roles even if they are present in the DB. A Super Admin cannot edit their own role or user record's role.
- **Owner** has every permission plus `confidential` and `allLocations`.
- Default roles (editable): Super Admin, Owner, Manager Head, Manager, Salesperson, Godown Staff, Vendor (seed in `src/server/seed/defaults.ts`).
- **Location scope:** non-`allLocations` users only see their `locationIds`. Enforce this in the **service query**, not the UI.
- **Confidential fields** (`costPrice`, margin, financial reports): strip them in the service unless `role.confidential`.
- The UI may hide buttons, but the server guard (`withGuard`) is the security boundary.

## Codes, SKUs and barcodes
- All generated numbers come from `nextCode(key)` in `src/server/services/numberSeries.ts` (an atomic `$inc`). Never compute "max + 1".
- Admin-configurable `prefix`, starting `next` and `padding` per series key (`sku`, `vendor`, `transfer`, `invoice:<LOC>`).
- Item code = `<SKU>-<NNN>` (e.g. `TB1000-001`).
- **Barcodes are Code 39** (`bwip-js`, `bcid: 'code39'`). Allowed characters: `A–Z 0–9 - . $ / + %` and space. Validate with `isCode39Safe()` from `src/lib/code39.ts`. Uppercase everything.

## Locations
`locations` documents with `type: godown | store | online`. Stores are created through the Settings → Stores wizard, never by code changes. Deactivate stores; don't delete one that has history.

## Code conventions
- Next.js App Router, TypeScript strict, `@/*` alias to `src/*`.
- Layers: `app/api/**/route.ts` (thin) → `server/services/*` (rules, transactions, audit) → `models/*` (Mongoose).
- Validate every input with Zod (`src/lib/validation/*`). API responses use `ok()` / `fail()` from `src/lib/api.ts` (`{ success, data, error, meta? }`).
- Immutability: return new objects and don't mutate inputs. Functions under 50 lines, files under 400 lines, organised by feature.
- Never log or return secrets, password hashes or stack traces. Secrets only in `.env.local` (see `.env.example`). **Never write the MongoDB URI anywhere else.**

## Adding a module (checklist)
1. Register permissions in `src/lib/rbac/permissions.ts` and update default roles in `src/server/seed/defaults.ts`.
2. Model in `src/models/` with indexes (unique codes, `locationId + status`).
3. Zod schemas in `src/lib/validation/`.
4. Service in `src/server/services/`: location scoping, confidential stripping, transaction and audit for writes.
5. Route handler using `withGuard('<module>.<action>', handler)`.
6. UI page under `src/app/admin/…` (server `page.tsx` calls `pageActor(permission)`; client components call the API with `api()` from `src/lib/http.ts`). **Load the `frontend-design` skill first** and follow the existing design tokens in `src/app/globals.css`.
7. Tests first (TDD): unit tests for pure logic, integration tests against `mongodb-memory-server` for the service (including the 403 and wrong-location cases), and a Playwright test for the main flow.

## Testing
- `npm test` (Vitest), `npm run test:e2e` (Playwright, runs a production build against the separate `thanvi_boutique_e2e` database, reset each run), `npm run typecheck`, `npm run lint`.
- Tests never touch Atlas; `tests/setup/db.ts` starts an in-memory replica set.
- Aim for at least 80% coverage on `src/lib` and `src/server`.

## UI
- **Brand = thanviboutique.com.** Cabin type (the site's font; IBM Plex Mono for codes/amounts), cream page `--ivory #fff8f5`, logo charcoal `--ink #25242b`, site gold `--gold-bright #d5b359` (use `--gold #a07a1f` for gold *text* on cream), maroon `--maroon #7b1e3a`, and the `.foil` gradient class for logo-style gold text. Tokens live in `src/app/globals.css`.
- **Logo:** use `<BrandLogo tone="dark" | "light" />` (`src/components/BrandLogo.tsx`). `dark` sits on `bg-ink` panels (its background is exactly `--ink`, so it blends); `light` is for cream/white and invoices. Files are in `public/brand/` (`thanvi-logo.png` is the untouched original from their site). App icons are `src/app/icon.png` and `apple-icon.png` (the "t" monogram). Never recolour or redraw the logo; keep `--ink` equal to the logo charcoal.
- **Storefront** lives at `/shop` (public; the middleware only guards `/admin`). It reads only `published` `WebListing`s through `src/server/services/storefront.ts`; never return SKU, cost, vendor or stock from there. Price always comes from `Product.mrp`, never from the listing.
- **Website content** = `WebListing` (one per product) edited in *Admin → Online catalog* (`src/server/services/catalog.ts`, `src/components/admin/catalog/`). Permission module `catalog` (`approve` = publish). Role **Content Editor** has catalog only. Publish rules live in `src/lib/storefront/listing.ts` (`publishChecklist`). Flow for the client: `docs/CONTENT_GUIDE.md`.
- **Photos:** admin preview via `/api/catalog/photos/[id]` (catalog.view); the public `/api/media/[id]` serves a photo **only while a published listing uses it**. Don't put product photos in `public/`.
- **SEO/GEO/AEO** (`docs/SEO.md`): every public page needs a unique title/description and a canonical; add JSON-LD with the builders in `src/lib/seo/jsonld.ts` via `<JsonLd />`, and any FAQ markup must also be visible (`<FaqList />`). Absolute URLs come from `absoluteUrl()` (`NEXT_PUBLIC_SITE_URL`). Never invent business facts (addresses, phones, ratings) in `src/lib/seo/site.ts`. New public routes go in `src/app/sitemap.ts`; private ones in `robots.ts` DISALLOW and `robots: { index: false }`.
- Demo sarees: `npm run seed:demo` / `-- --remove` (`src/server/seed/demoCatalog.ts`, photos in `seed-assets/demo-sarees/`). E2E global setup seeds them too.
- Dense tables for staff, large touch targets on POS. Thermal receipts and 50×25 mm labels stay text-only (gold artwork prints badly on thermal paper).
- Always use the `frontend-design` skill for new screens.

## Inventory & billing building blocks (use these, don't re-implement)
- **Money is integer paise everywhere** (`src/lib/money.ts`: `toPaise`, `formatINR`, `amountInWords`). Rupees only at the API edge for user-typed values.
- **`transitionItem()`** (`src/server/services/stockLedger.ts`) is the only way to change an item's status/location/bin: a conditional update plus a ledger row inside the caller's transaction.
- **Bins** (`models/Bin.ts`): rack/shelf codes per location (`R2-S3`). Items carry `binId`; scanning shows location and bin. Dispatch clears the bin; receiving can set one.
- **Transfers**: `requested → approved → in_transit → received` (or `cancelled`). Dispatched items move to the destination's `locationId` with status `in_transit`. A final receive records `shortCodes`/`excessCodes`.
- **GST engine** `src/lib/gst/engine.ts` is pure and shared by the POS preview and the server. The longest HSN prefix wins; slabs apply to the taxable value per piece after discounts; CGST+SGST vs IGST comes from the seller's state (GSTIN) vs the place of supply.
- **Invoices are immutable**: lines, totals and a `seller` snapshot are frozen at billing time. Numbers come from `invoice:<STORECODE>`. Cash/UPI/card → `closed` and items `sold`; Razorpay → `open` and items `reserved`, until `/api/webhooks/razorpay` (HMAC-verified, idempotent) closes it. Only `open` invoices can be cancelled; paid ones need credit notes (not built yet).
- **Invoice layout** lives in `src/components/invoice/InvoiceDocument.tsx` (`classic` A4, `compact` 80 mm). Business details come from GST & invoice settings. Match the client's sample invoice there.
- **Data migrations** go in `src/server/seed/migrations.ts` (append-only, run once each via `npm run seed`). Use them whenever new permissions or defaults must reach an existing database.
- **Client components must not import runtime values from `@/models`, `@/server` or `@/lib/validation`** (that bundles Mongoose into the browser). `import type` is fine; shared constants go in dependency-free files such as `src/lib/gst/rates.ts`.

## Dashboard & analytics
- `/admin` is role-aware: Super Admin → setup desk; `dashboard.view` → sales overview (`src/server/services/analytics.ts`, `src/components/admin/dashboard/`); everyone else → shortcuts filtered by permission.
- Sales = invoices with status `closed` or `paid`. Always apply `locationFilter(actor)`; margin only when `role.confidential`. Bucket days in IST with the helpers in `src/lib/analytics/periods.ts`.
- The forecast is pure (`src/lib/analytics/forecast.ts`); keep it explainable and show its range and confidence, never a single promised number.
- Charts are hand-built (no chart library): one hue for magnitude, the hatched gold `.forecast-fill` for forecast, text in ink tokens, a legend and hover read-out. Load the `dataviz` skill before adding a chart.
- Demo data is always removable and flagged: `DEMO-` invoice numbers, `demo-*@thanvi.test` logins (password from `SEED_DEMO_PASSWORD`), `demo: true` listings.

## Gotchas learned so far
- Custom CSS classes (`.btn`, `.field`, `.panel`, …) must stay inside `@layer components` in `globals.css`; unlayered CSS beats Tailwind v4 utilities and breaks things like `lg:hidden`.
- Forms that submit via `fetch` must keep the submit button disabled until hydrated and declare `method="post"`, so a fast click can never submit natively (and never put a password in a URL).
- Don't run Playwright against `next dev`: the dev watcher picks up Playwright's artifact writes and rebuilds in a loop. The config already uses `next build && next start`.
- Mongoose 9: use `returnDocument: "before" | "after"`, not `new: true`.
- Don't name a schema path `collection` (reserved by Mongoose). `WebListing` stores it as `collectionKey`.
- Don't add `loading.tsx` above dynamic storefront pages: it makes `notFound()` return 200 (bad for SEO) and swallowed fast clicks on the collection page. Use `<LinkPending />` (`useLinkStatus`) for navigation feedback instead.
- Storefront motion lives in `globals.css` (`.pop-in`, `.bump`, `.shimmer`, `[data-reveal]`, …) and is disabled under `prefers-reduced-motion`. Wrap reveal-on-scroll content in `<Reveal>`.
