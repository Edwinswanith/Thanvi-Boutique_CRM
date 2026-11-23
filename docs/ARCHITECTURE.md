# Thanvi Boutique: Architecture

## Stack
- **Next.js 15** (App Router, TypeScript strict). One app, route groups:
  - `src/app/admin` back office + POS (signed-in staff; `src/middleware.ts` redirects signed-out users)
  - `src/app/(store)` public storefront *(Phase 3, route group at `/`)*
  - `src/app/vendor` vendor portal *(Phase 5)*
  - `src/app/api/*` route handlers (all business logic goes through services)
- **MongoDB Atlas** (replica set, so multi-document transactions work) via **Mongoose**.
- **Zod** validation on every API input.
- **Auth:** email + password (bcrypt), signed JWT session cookie (`jose`, HS256, httpOnly, sameSite=lax). Session carries `userId` only; role and locations are re-read from the DB on every request so permission changes apply immediately.
- **Barcodes:** `bwip-js`, Code 39.
- **Payments:** Razorpay Orders + Payment Links, signed webhooks *(Phase 2)*.
- **Tests:** Vitest + `mongodb-memory-server` (replica set) for unit and integration; Playwright for E2E.

## Layers
```
UI (server components / client forms)
   │ fetch
API route handler  ── withGuard(permission) → loads actor, checks permission + location
   │
Service (src/server/services/*)  ── business rules, transactions, audit log
   │
Model (src/models/*)  ── Mongoose schemas, indexes
```
Rules: route handlers stay thin; services never trust input (Zod-parsed first); every write that changes stock, money or access writes an `auditLogs` entry inside the same transaction.

## Permissions model
- `Permission = "<module>.<action>"`, e.g. `inventory.view`, `transfers.approve`, `system.roles.edit`.
- Modules are listed in `src/lib/rbac/permissions.ts` and split into **system** modules (roles, users, locations, numbering) and **data** modules (inventory, transfers, sales, customers, reports, staff, ...).
- A role has `permissions: string[]`, `confidential: boolean` and `allLocations: boolean`.
- **Super Admin** role: `isSystem: true`, only system permissions. The guard rejects any data permission for a system role even if one is added by mistake. A Super Admin cannot change their own role.
- **Location scope:** a user sees data for `user.locationIds` unless the role has `allLocations`.
- **Confidential fields** (`costPrice`, `margin`, financial reports) are removed in the service layer unless `role.confidential`.

## Number series
`numberSeries { key, prefix, next, padding }` with `findOneAndUpdate({$inc:{next:1}})`, which is atomic, so concurrent requests never get the same number. Keys: `sku`, `vendor`, `transfer`, `invoice:<locationCode>`. Prefixes are validated against the Code 39 character set.

## Stock state machine (Phase 1+)
```
            receive            send (transfer)          receive
 (vendor) ─────────▶ AVAILABLE ───────────────▶ IN_TRANSIT ───────▶ AVAILABLE @dest
                        │  ▲
          reserve       │  │ release
                        ▼  │
                     RESERVED ──pay──▶ SOLD ──return──▶ RETURNED ─▶ AVAILABLE
 AVAILABLE ─▶ RENTED / STITCHING / DAMAGED ─▶ AVAILABLE
```
Every transition is a conditional update `updateOne({_id, status: <expected>}, {$set: …})` in a transaction, plus an append-only `stockMovements` row. If `matchedCount` is 0 the operation aborts, which prevents double sales and double dispatch.

## Collections
See `docs/REQUIREMENTS.md` §3–8. Phase 0 implements: `locations`, `roles`, `users`, `numberSeries`, `auditLogs`.

## Security
- Secrets only in `.env.local` (git-ignored). `src/lib/env.ts` checks required variables at startup.
- Passwords: bcrypt, cost 12. Login rate-limited per IP+email (in-memory for now; move to Redis/Upstash when multi-instance).
- Middleware redirects unauthenticated users; route guards enforce permissions server-side (the UI hides buttons, but that is never the security boundary).
- Mutating API routes check `Origin` matches host (CSRF defence alongside sameSite cookies).
- Error responses never leak stack traces or DB details.

## API envelope
```json
{ "success": true, "data": {...}, "error": null, "meta": { "total": 10, "page": 1, "limit": 20 } }
```
