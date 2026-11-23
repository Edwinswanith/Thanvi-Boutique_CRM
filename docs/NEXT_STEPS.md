# Next steps & improvements

Status as of 2026-11-19: Phases 0–1 done, Phase 2 billing framework done. Items are ordered by priority.

## Needed from the client (blocks go-live)
0. **Live domain + store details for search:** set `NEXT_PUBLIC_SITE_URL`, and fill store addresses, phones and social links in `src/lib/seo/site.ts` ([SEO.md](SEO.md)).
1. **Sample invoice** → match it in GST & invoice settings, then adjust `src/components/invoice/InvoiceDocument.tsx` if the layout differs (logo, bank details, QR, column order).
2. **CA sign-off on GST rules.** Two draft rules are seeded: fabrics/sarees (HSN 50–55) at a flat 5%, and readymade garments (HSN 61–63) at 5% up to ₹2,500 per piece and 18% above. Confirm the rates, slabs, whether MRP includes GST, and the HSN codes they actually use.
3. **GSTIN per store** (Settings → Stores) and the business GSTIN and address (GST & invoice). Invoices currently print "GSTIN: —".
4. **Razorpay account:** API keys and webhook secret.
5. **Label printer model and label size.** The labels are built for 50×25 mm thermal; adjust to their printer.
6. **Incentive formula** and **attendance method** (for Phase 4).

## Billing — next build items
- **Returns & exchanges with credit notes.** Paid invoices can't be reversed yet. Add a credit-note document that returns pieces to stock (status `returned` → inspect → `available`).
- **Offers engine:** saved campaigns (category, store or date-based offers, minimum purchase, promo price) applied automatically at the POS. Today discounts are typed in per line or per bill.
- **Split payments** (part cash, part UPI) and change calculation for cash.
- **Customer directory** (phone lookup, purchase history) shared by POS, Instagram, stitching and rental.
- **E-invoicing / e-way bill**, if their turnover requires it (IRN + QR on B2B invoices).
- **Discount approval limits:** e.g. a salesperson can give up to 10%, beyond that a manager PIN.
- **Daily closing / Z-report** per counter (cash in drawer vs system).

## Inventory — next build items
- **Bin labels:** print Code 39 labels for racks and shelves so staff scan the shelf, then the saree (faster put-away).
- **Stock audit / cycle count:** scan a bin and the system flags missing and extra pieces.
- **Damage / return-to-vendor** flow and a write-off approval.
- **Bulk receiving from a vendor invoice** (multiple SKUs in one GRN) and purchase orders for the vendor portal.
- **Low-stock alerts** per category and store, and **reorder suggestions** from sales speed.
- **Online stock allocation** to the website (the `WEB` location), with reservation on checkout.
- Move photos from MongoDB GridFS to S3 or Cloudflare R2 with image resizing once volume grows.

## Storefront (Phase 3) — next build items
Done: web listings + Online catalog editor (photos, copy, SEO, publish), Content Editor role, public storefront on published listings, bag drawer, gallery/zoom, schema.org product data. Content flow: [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
- **Remove demo content before go-live:** `npm run seed:demo -- --remove`, then write real copy for real products.
- Show **web stock**: count pieces allocated to the `WEB` location, show "Sold out" or "Only in store", and block adding sold-out pieces.
- Server-side cart with item reservation (`available → reserved`) and expiry, Razorpay checkout, and the webhook closing the order.
- Customer accounts and addresses, order tracking, the exchange flow (their policy is exchange only), and shipping rates.
- Editable collections (today the 11 fabric collections are fixed in code), plus home-page banners/hero picks managed from the admin.
- Image pipeline: move photos from GridFS to S3/R2 with resized variants once volume grows; add alt-text per photo.
- On-site search; scheduled publishing; listing version history (the audit log already keeps before/after).
- SEO/GEO client actions (store addresses, Search Console, Bing Webmaster, Google Business Profiles, Merchant Center feed): see [SEO.md](SEO.md).
- Decide the domain plan: keep Shopify for the storefront and sync stock, or move the site to this app.

## People, vendors & analytics (Phase 4)
Done: owner dashboard (sales by store, channel, salesperson, product, payment mode; margin; 7-day forecast), role-based home pages, and vendor dues (a bill per delivery, part payments, pending and overdue per vendor, dashboard card).
Decided with the team on 2026-11-23, to build next:
- Vendor dues follow-ups: credit days per vendor (30 for all today), GST on vendor bills (input tax credit), one payment across several bills, advance payments, a vendor statement to print or export, and returns to vendor (debit notes).
- **Staff and attendance:** managers keep their team list and mark attendance daily (present, absent, half day, leave).
- **Salary:** a monthly salary per staff member, marked as credited by the manager, with incentive added. Record and track only; no automatic deductions.
- **Incentives:** needs the client's formula.
- Add salary paid/pending and attendance to the owner dashboard once those exist.
- Remove sample sales and demo logins before go-live: `npm run seed:demo -- --remove`.

## Platform & operations
- **Reports** (Phase 4): GST summary (GSTR-1-friendly export), slow sellers, exports.
- **Hosting:** deploy (e.g. Vercel + Atlas), set up a custom domain and HTTPS, Atlas backups, and error monitoring (e.g. Sentry).
- **Login rate limiting via Redis/Upstash** once there is more than one server instance (today it's in-memory).
- **Offline POS** decision: if store internet is unreliable, plan a local-first POS with sync.
- **Rotate the MongoDB password** that was shared in chat.
