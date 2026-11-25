# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Thanvi Boutique operations platform: a saree retailer's inventory, godown→store transfers, GST POS billing, vendor payables, owner analytics and a public storefront, in one Next.js 15 (App Router) + TypeScript + MongoDB (Mongoose 9) + Tailwind v4 app.

**Load the `thanvi-boutique` project skill (`.claude/skills/thanvi-boutique/SKILL.md`) for any work here.** It has the full domain rules, building blocks to reuse, UI/brand tokens and gotchas. This file summarises; the skill and `docs/ARCHITECTURE.md` / `docs/REQUIREMENTS.md` are the detail.

## Commands

```bash
npm run dev                 # http://localhost:3000 (/ → /shop, /admin = back office)
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm test                    # Vitest unit + integration (in-memory Mongo replica set, never Atlas)
npm run test:coverage       # thresholds: 80% lines/functions/statements, 70% branches on src/lib + src/server
npm run test:e2e            # Playwright: next build && next start on :3100 against DB thanvi_boutique_e2e (dropped + reseeded each run)
npm run seed                # idempotent: roles, locations, number series, first users, AND pending migrations
npm run seed:demo           # demo sarees/sales/vendors/logins; `npm run seed:demo -- --remove` deletes them
```

Single tests:
```bash
npx vitest run tests/integration/billing.test.ts
npx vitest run tests/unit/gst.test.ts -t "slab"
npx playwright test e2e/storefront.spec.ts
```

- Vitest runs files serially (`fileParallelism: false`); integration tests call `setupTestDb()` from `tests/setup/db.ts`, which drops the DB and runs `runSeed([])` before **each** test. Use `actorWithRole(slug, overrides)` to build an actor.
- E2E needs `MONGODB_URI` in `.env.local` (global setup refuses to drop any DB other than `thanvi_boutique_e2e`). Set `PLAYWRIGHT_REUSE_SERVER=true` to reuse a running server, `PLAYWRIGHT_CHROME_EXECUTABLE` for a custom Chrome. Never point Playwright at `next dev` (rebuild loop).
- MongoDB must be a replica set: services rely on transactions.

## Architecture

Request flow: `src/app/api/**/route.ts` (thin) → `withGuard('<module>.<action>', handler)` (`src/server/guard.ts`: same-origin check for mutations, session, active user, permission, error → envelope) → `src/server/services/*` (business rules, location scoping, confidential-field stripping, transactions, audit) → `src/models/*`.

- Responses always use `ok()` / `fail()` from `src/lib/api.ts` → `{ success, data, error, meta? }`. Services throw `AppError(message, status)` for user-safe errors; Zod errors become 422, duplicate keys 409.
- Admin pages: server `page.tsx` calls `pageActor(permission)` (`src/server/page.ts`); client components call APIs via `api()` from `src/lib/http.ts`. `src/middleware.ts` only redirects signed-out users away from `/admin`; permission enforcement is server-side per route/service.
- RBAC: permissions `<module>.<action>` registered in `src/lib/rbac/permissions.ts`; default roles in `src/server/seed/defaults.ts`. Super Admin is system-only and **data-blind** (enforced in `hasPermission`). Location scoping uses `locationFilter(actor)` from `src/server/scope.ts` in the query, not the UI.
- Schema/permission changes that must reach existing databases go in append-only `src/server/seed/migrations.ts` (applied by `npm run seed`).
- Pure, client-safe logic lives in `src/lib` (GST engine `src/lib/gst/engine.ts`, forecast `src/lib/analytics/forecast.ts`, publish checklist `src/lib/storefront/listing.ts`). Client components must not import runtime values from `@/models`, `@/server` or `@/lib/validation` (pulls Mongoose into the bundle); `import type` is fine.
- Storefront (`/shop`) reads only published `WebListing`s via `src/server/services/storefront.ts`; price always from `Product.mrp`; never expose SKU/cost/vendor/stock. Public photos via `/api/media/[id]` only while a published listing uses them. Shop checkout (`shopCheckout.ts`) is a simulated test checkout, enabled only in development or with `ENABLE_TEST_CHECKOUT=true`.

## Invariants (never break)

- **Stock is item-level**: one `items` doc per physical piece; counts are derived from `locationId + status`, never stored.
- **Status changes go through `transitionItem()`** (`src/server/services/stockLedger.ts`): conditional `updateOne({ _id, status: expected })` + `stockMovements` row, inside `session.withTransaction`, plus an audit row. Abort if nothing matched.
- **Generated numbers** (SKU, vendor, transfer, `invoice:<STORE>`) only via `nextCode(key)` (`src/server/services/numberSeries.ts`). Item code = `<SKU>-<NNN>`, Code 39-safe uppercase (`isCode39Safe()`).
- **Money is integer paise** (`src/lib/money.ts`). GST comes from configurable `taxRules`, never hardcoded.
- **Invoices are immutable**; Razorpay invoices stay `open` (items `reserved`) until the HMAC-verified, idempotent webhook at `/api/webhooks/razorpay`.
- `recordPayment` is the only way vendor bill `paidAmount` changes.

## Gotchas

- Mongoose 9: use `returnDocument: "before" | "after"`, not `new: true`. Don't name a schema path `collection` (`WebListing` uses `collectionKey`).
- Custom CSS classes in `src/app/globals.css` must stay inside `@layer components`, or they override Tailwind utilities.
- No `loading.tsx` above dynamic storefront pages (makes `notFound()` return 200); use `<LinkPending />`.
- Fetch-submitted forms: `method="post"` and submit disabled until hydrated.
- New public routes go in `src/app/sitemap.ts`; private ones in `robots.ts` disallow + `robots: { index: false }`. Don't invent business facts in `src/lib/seo/site.ts`.
- Use the `frontend-design` skill for new screens and the `dataviz` skill before adding charts (charts are hand-built, no chart library).

## Repo quirks

- `.env.checkout-preview/` and `.env.client-demo/` are **directories**, not env files (a separate copy of the app and a local demo MongoDB data dir/scripts). They are git-ignored via `.env*`; don't edit them or treat them as the source tree.
- Secrets live only in `.env.local` (git-ignored); `.env.example` lists every key.
