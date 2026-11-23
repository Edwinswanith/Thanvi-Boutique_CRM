# Thanvi Boutique: Requirements (source of truth)

Merges the *Thanvi Boutique Application Requirements & Process Flow* PDF with the client call of 2026-11-18. Where the two differ, the call notes win.

## 1. Business
Thanvi Boutique sells sarees and related products through:
- **Physical stores** (4 today; the business must be able to add more on its own)
- **Godowns** (Godown 1 receives from vendors; Godown 2 distributes)
- **E-commerce website** (customers order online)
- **Instagram** (orders taken in DMs and entered by staff)

Stock comes from **vendors**.

**Core principle:** one physical product → one unique code → full traceability from vendor receipt to sale.

## 2. Locations (self-serve)
- Locations are data, not code: `godown`, `store` or `online`.
- The Super Admin can **create a new store** from a wizard (name, code, address, GSTIN, invoice prefix, manager). Its inventory scope, billing counter and reports appear automatically.
- Locations can be deactivated but never hard-deleted once they have transactions.

## 3. Roles and access
| Role | Can do | Cannot do |
|---|---|---|
| **Super Admin** | Create/edit/delete roles, users, locations, numbering settings | **See any business data** (stock, sales, customers, costs, reports) |
| **Owner / Admin** | Everything, including cost price, margins and all metrics | — |
| **Manager Head** | Oversee all or assigned stores: stock, sales, staff, approvals | Cost price unless granted |
| **Manager** | Own store: inventory, stock requests, staff, attendance, incentives | Other stores |
| **Salesperson** | POS billing, own sales, stock lookup at own store | Cost, other stores, reports |
| **Godown Staff** | Receiving, photos, labels, dispatch and receipt at assigned godown | Cost unless granted |
| **Vendor** | Vendor portal: own purchase orders and deliveries | Anything else |

- Permissions are configurable per module and action: View, Create, Edit, Delete, Approve, Export, plus a **Confidential** flag (cost price, vendor cost, margin, financial reports).
- Access is also scoped by **location** per user.

## 4. Products, SKU and barcodes
- On arrival, staff **take a photo** and enter product details (vendor, name, category, HSN, quantity, purchase price, MRP, date).
- **SKU auto-generated.** Admin can set the **prefix** (e.g. `TB`) and the **starting number** (e.g. 1000) and padding for each number series.
- Each physical piece gets its own **item code** = `SKU-NNN` (e.g. `TB1000-001`).
- **Barcodes use Code 39** ("Code 3 of 9"). Labels show the barcode, item code, name and MRP and are printed in sheets. Prefixes may only use Code 39 characters: `A–Z 0–9 - . $ / + %` and space.

## 5. Stock movement
- Standard flow: Vendor → Godown 1 → Godown 2 → Store / Online. Direct Godown → Store is allowed through a destination dropdown that applies to all selected items.
- **Stock request:** a store manager requests items → godown approves → godown marks **Sent** (stock **debited from godown**, items **In Transit**) → store scans and marks **Received** (stock **added to store inventory**). Short or excess quantities are recorded.
- Transfer statuses: Created → Dispatched → In Transit → Received.
- **Every sale reduces stock immediately and exactly.** A sold code can never be billed again.
- Item statuses: Available, Reserved/Hold, In Transit, Sold, Rented, In Stitching, Damaged, Returned.
- Every movement is logged with user, time and reference.

## 6. Sales channels and billing
- **Store POS:** scan barcode → offers applied → GST → invoice → payment (cash, UPI, card, Razorpay link, split).
- **Online:** website checkout with **Razorpay**.
- **Instagram:** staff create the order with channel = Instagram and send a **Razorpay payment link**.
- **Invoice lifecycle:** Open → Paid → Closed. When Razorpay confirms payment (signed webhook), the invoice closes automatically.
- **Offers:** % off, flat off, product, category, outlet, date-based campaign, minimum purchase, promo price.
- **GST** is calculated on the taxable value after discount, using configurable rules (HSN, price slab). **Must be validated by the client's CA before go-live.**

## 7. Analytics (Owner)
- Sales by date, store, channel, product, category, vendor and salesperson.
- Best and slowest sellers by date range; stock by location and status; in-transit stock; low-stock alerts.
- Daily and monthly sales, GST breakup, payment-mode, invoice-wise and product-wise reports with export.

## 8. Staff, attendance and incentives (Managers)
- Managers add staff to their store.
- Daily attendance (present, absent, half-day, leave).
- Performance: sales value and count per salesperson.
- Incentive rules (e.g. % of sales or target slabs) calculated monthly; the manager reviews and approves payouts.

## 9. Other modules (later phases)
- **Stitching:** order → tailor assigned → in progress → quality check → ready → delivered.
- **Rental:** booking → issue → return → inspection → available, with advance, balance and damage/late fees.
- **Vendor portal:** vendors see their purchase orders, deliveries and payment status.

## 10. Phases
| Phase | Scope |
|---|---|
| 0 Foundation | Auth, roles and permissions, locations wizard, number series, audit log |
| 1 Inventory | Vendors, receiving with photo, SKU/item codes, Code 39 labels, requests/transfers, traceability |
| 2 POS & billing | POS, offers, GST, invoices, payments + Razorpay, Instagram orders, sales/GST reports |
| 3 Storefront | Catalog, cart, Razorpay checkout, online stock, fulfilment |
| 4 People & analytics | Staff, attendance, incentives, Owner dashboard |
| 5 Extras | Vendor portal, stitching, rental, notifications |

## 11. Open questions for the client
1. Non-unique items (blouse pieces, accessories): per-piece codes or quantity per SKU?
2. Is MRP GST-inclusive? Which GST slabs apply? (CA sign-off)
3. Returns, exchanges and credit notes.
4. Incentive formula: flat %, target slabs or per product?
5. Attendance: manager marks it, or staff check in themselves?
6. Label printer model and label size.
7. Domain and hosting; does POS need to work offline?
8. What does `TB713` in the PDF example code mean (vendor, batch or PO)?
