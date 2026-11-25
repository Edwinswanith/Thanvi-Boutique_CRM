# Thanvi Boutique Simplified CRM Blueprint

Each person lands on **Home** with their role, current location and next task. Godown staff see what to receive or send. Shop staff can open a bill or find a saree. Managers see the decisions their locations need. Owner / Admin sees the business and controls its configuration.

**Inventory** answers where each piece is. **Sales** handles billing, orders and their invoices. **Reports** and **Settings** serve people who need oversight or configuration. Every piece keeps its original barcode through receiving, transfers, sale and any approved return.

The primary source is *Thanvi Boutique Application Requirements & Process Flow*, pp. 1–10. The [project requirements](REQUIREMENTS.md) document existing business decisions such as separate setup accounts, website publishing, Instagram and team operations. The pages and permissions below are the proposed design.

## 1. Roles and responsibilities

| Role | Responsibility and scope | What Home shows first |
| --- | --- | --- |
| **Owner / Admin** | Runs and configures the business across all locations. Owns products, vendors, costs, margins, offers, tax, reports, users and permission assignments. This is the PDF's full-access **Super Admin**. | Today's and monthly sales, total and location stock (each godown, shop and WEB), in-transit stock, pending transfers and count differences, low stock and active offers. Pending stitching and rental bookings appear when those flows open. Vendor bills that need attention link to the vendor record. |
| **Manager Head** | Oversees assigned godowns, shops and online operations. All-location coverage is an explicit grant. Handles approvals and exceptions within that scope. | Requests awaiting approval, delayed receipts, stock differences, low stock and sales at assigned locations. Online work appears with WEB access. |
| **Shop Manager** | Runs assigned shops. Requests and accepts stock, reconciles counts, supervises billing and shop staff, and reviews shop performance. | Incoming stock to receive, low stock, count differences, today's sales and open payment issues for the selected shop. |
| **Godown Staff · Receiving** | Receives and verifies vendor deliveries at the designated receiving godown, initially **Godown 1**. Labels, shelves, counts and dispatches pieces. | **Receive vendor stock**, transfers to send, stock counts and receipt discrepancies. |
| **Godown Staff · Distribution** | Receives incoming transfers at the distribution godown, initially **Godown 2**. Sends to shops or WEB, shelves and counts pieces, and reports discrepancies. | Transfers to **Receive** or **Send**, items awaiting put-away and stock counts. |
| **Shop Staff / Salesperson** | Bills customers at assigned shops, looks up local stock and finds their own invoices. Helps with receiving or counts when assigned those actions. | **New bill**, **Find item** and **My invoices**. Assigned receiving or count tasks link straight to the relevant record. |
| **Content Editor** | Publishes website photos, copy and listings linked to existing products. Uses the existing catalog role. | Draft listings to finish and listings with an availability issue to hand to operations. |
| **Setup Admin** | An optional assignment for the current technical setup role. Manages delegated location, account and numbering settings. | Locations, user assignments and numbering. |

The two godown profiles use the same Inventory workspace, with different actions at receiving and distribution locations. Shop Manager is the existing Manager role. Manager Head or a Manager with WEB assignment handles online orders. A **vendor** is the supplier recorded on a delivery. A **customer** buys through a shop or the public website.

## 2. Sidebar by role

| Role | Sidebar in display order |
| --- | --- |
| Owner / Admin | **Home**, **Inventory**, **Sales**, **Team**¹, **Reports**, **Settings** |
| Manager Head | **Home**, **Inventory**, **Sales**, **Team**¹, **Reports** |
| Shop Manager | **Home**, **Inventory**, **Sales**, **Team**¹, **Reports** |
| Godown Staff · Receiving | **Home**, **Inventory** |
| Godown Staff · Distribution | **Home**, **Inventory** |
| Shop Staff / Salesperson | **Home**, **Inventory**, **Sales** |
| Content Editor | **Home**, **Catalog** |
| Setup Admin | **Home**, **Settings** |
| Customer | Public shop and checkout. |
| Vendor | **My orders** in the separate supplier portal when that existing roadmap item is released. |

¹ **Team** appears for managers and the Owner once the existing staff, attendance and incentive workflow is available. The same visibility rule applies to later pages inside each section. A user with one location sees it in the header. A user with several sees a picker limited to assigned locations. Give each task a clear verb, such as **Receive transfer**, and a short status that explains whose action is next.

## 3. Pages and actions

| Section | Pages and main actions |
| --- | --- |
| **Home** | Role-specific tasks and summaries. A pending item opens the transfer, order, invoice or stock count that needs action. |
| **Inventory** | **Stock** searches by barcode and filters by product, location, vendor and status. Item details contain movement history and shelf/bin actions. **Products** manages the shared SKU, product name, category, HSN, MRP and photos. **Receive** verifies vendor deliveries, creates or restocks a SKU, assigns a bin and prints or reprints piece labels. **Transfers** covers requests, direct sends, incoming stock and history. **Stock counts** covers counts, differences and adjustments. **Vendors** holds supplier details, linked receipts and authorized vendor bills and payments. |
| **Sales** | **Billing** scans items, applies offers, calculates GST and takes payment. **Invoices** searches and prints issued bills and shows open payment status. **Orders** handles website and assigned Instagram orders, with payment, fulfilment and linked invoice on the same record. **Catalog** prepares and publishes website listings. **Offers** sets discount and campaign rules. **Stitching** and **Rentals** are later pages for the assigned team. |
| **Team** | **Staff & attendance** holds the assigned team's records and daily attendance. **Incentives** shows sales counts and value by salesperson, monthly calculation and payout approval. Salary credit tracking belongs with this existing team workflow when enabled. |
| **Reports** | **Stock** includes location, product, vendor and status, with low stock and transit. **Sales & GST** includes daily and monthly totals, location, channel, invoice, product/category, vendor, salesperson, payment mode, best and slow sellers, discount, taxable value and GST breakup where authorized. **Audit history** shows the person, time, action and transaction reference. Export follows the same permissions as the screen. |
| **Settings** | **Locations** sets up shops, godowns and WEB stock, with codes, address, GSTIN, invoice prefix, assigned manager and optional shelf/bin layout. **Users & permissions** combines accounts, roles, allowed locations and permission levels. **Numbering** configures future SKU, Vendor ID, receipt, transfer and invoice references. **GST & invoice** configures HSN or price-based rules, inclusive or exclusive pricing and the invoice layout. |

### Pages visible inside each sidebar

| Role | Workspace pages |
| --- | --- |
| Owner / Admin | All pages above as released. Critical summaries on Home link into those pages. |
| Manager Head | Inventory **Stock**, **Products** (view), **Transfers**, **Stock counts**. Sales **Billing**, **Invoices**, **Orders** for assigned channels, and **Stitching** and **Rentals** when assigned and released. **Team** when released. Reports **Stock**, **Sales & GST** and **Audit history** limited to operational data and granted fields. |
| Shop Manager | Inventory **Stock**, **Transfers**, **Stock counts**. Sales **Billing**, **Invoices** and later **Stitching** and **Rentals** at assigned shops. **Orders** appears with an assigned online or Instagram duty. **Team** when released. Reports **Stock** and **Sales & GST** with assigned-shop data. |
| Godown Staff · Receiving | Inventory **Stock**, **Receive**, **Transfers**, **Stock counts**. Select or add a supplier as permitted inside **Receive**. |
| Godown Staff · Distribution | Inventory **Stock**, **Transfers**, **Stock counts**. |
| Shop Staff / Salesperson | Inventory **Stock** for lookup. **Transfers** or **Stock counts** appears with the corresponding assigned duty. Sales **Billing**, **Invoices** (their own bills). **Orders**, **Stitching** or **Rentals** appears only when the page is released and the work is explicitly assigned. |
| Content Editor | **Catalog** opens the same listing workspace used by Owner / Admin. |
| Setup Admin | Settings **Locations**, **Users & permissions**, **Numbering** as delegated. |

## 4. Daily workflows and handoffs

### Owner / Admin and Setup Admin

1. Open **Settings → Locations** to add a shop or godown. An active shop uses the same stock and billing pages with its own inventory scope and numbering.
2. In **Users & permissions**, assign a role, allowed locations and any additional duties. Owner / Admin authorizes access to costs and other confidential data.
3. Owner / Admin manages vendors, tax, invoice templates and offers. From **Home**, open a pending vendor bill or stock exception directly and use **Reports** to review the business. A Setup Admin follows the setup tasks assigned to them.

### Godown 1 receives stock from a vendor

1. Open **Inventory → Receive**. Select the supplier by Vendor ID. Generate an ID when an authorized user adds a new supplier.
2. Verify the delivery and enter the quantity, receipt date, selling price and product details, including photo, category and HSN for a new SKU. Select **Restock existing SKU** for the same product. An authorized user records purchase cost against the same receipt. Staff without cost access can complete the quantity and put-away, and Owner / Admin sees the linked bill that needs an amount.
3. Confirm once to create the receipt and the unique piece codes. Print Code 39 labels with the code, product name and MRP. Attach one to each piece and select the shelf or bin if used. The stock appears as available at the receiving godown.
4. Prepare outgoing pieces in **Transfers**. The next location receives those same codes.

### Shops request stock and godowns send it

1. In **Inventory → Transfers**, the Shop Manager clicks **Request stock**, selects the source godown and enters products and quantities. The assigned shop is the destination.
2. An authorized approver at the source godown confirms the request once. A godown user with dispatch permission can start **Send stock** for routine direct transfers. This includes Godown 1 to Godown 2 and permitted direct sends to a shop. Pick the destination once for the entire batch.
3. The sender scans available pieces at the source, checks the transfer date and reference, and clicks **Dispatch**. Those pieces leave source on-hand and show as **In transit** to the destination.
4. The destination user opens **Incoming**, scans what arrived, chooses a bin if needed and confirms receipt. Matched pieces become destination stock. For a partial receipt, show received and pending quantities. Record shortages and excess codes against the transfer and route them to the assigned manager. An unmatched scan stays under investigation until reconciled.
5. Godown 2 repeats **Send stock** for shops or for WEB allocation. Online stock can also come directly from Godown 1 when that route is authorized. The destination team verifies the batch before it becomes sellable.

Keep the record timeline as **Created → Dispatched → In transit → Received**. **Dispatch** records the event and starts transit in the same action. A requested transfer shows **Awaiting approval** before dispatch, and a receipt with a discrepancy links to the exception. If the business moves stock back from a shop to a godown, an authorized manager uses the same send and receive steps with a reason and the original transfer reference where applicable.

### Shop staff bill a customer

1. Open **Sales → Billing** at the assigned shop. Scan each barcode or type the code. The CRM adds the product and price only for an available piece at that shop. If a piece is already on the bill or sold, show that status alongside the code.
2. Apply an eligible offer and show MRP, discount, final selling price, taxable value, GST and amount payable. Configure percentage, flat, product, category, outlet, date-based, minimum-purchase and promotional-price offers in **Sales → Offers**. Apply the configured tax treatment to the discounted sale. Use the requested 18% across products for testing and have the business/CA validate the production settings.
3. Record cash, UPI or card. A Razorpay payment link, when configured, holds the pieces while the invoice is open. Verified payment closes the invoice. Open it to print. A completed sale marks those exact pieces **Sold** and reduces the shop's stock once.
4. Open **Invoices** to find a previous bill. A Shop Manager handles payment or stock exceptions within their scope and approves eligible reversals under the business's return policy.

### Online sales and website content

1. The Content Editor opens **Catalog**, selects an existing SKU and adds photos and copy. Publishing makes the listing visible. The website can sell only pieces available in the separate **WEB** stock pool.
2. The assigned Manager or Manager Head opens **Sales → Orders** to track payment and pick the allocated pieces. The fulfilment flow is **New → Packing → Shipped → Delivered**. An assigned staff member can record an Instagram order with its channel and use a Razorpay payment link when enabled.
3. In the current test checkout, a confirmed dummy or test COD order links to the exact pieces and stores shipping and tax totals for the test invoice. WEB availability drops once, and an eligible cancellation releases those same pieces. Live paid-sales totals count completed live payments only.
4. With future live Razorpay checkout, the same order shows the payment and fulfilment states. Accepted orders hold the selected pieces. Verified payment or the configured COD completion records the sale once. A failed or cancelled pre-sale order releases its hold. A paid cancellation or return follows an approved reversal with an audit reference.

### Manager checks and later service work

- **Shop Manager** starts with incoming transfers, low stock and today’s sales for the assigned shop. Ask for stock, receive it, resolve count differences and review bills from those tasks. When Team opens, maintain the shop roster, mark daily attendance and review monthly incentives before approving payouts.
- **Manager Head** reviews exceptions across assigned locations. Approve source requests or count adjustments where authorized, follow late or short transfers and compare stock and sales from Reports.
- **Stitching** starts from the customer/order and piece code. Record stitching type, measurements, tailor, due date and payment. Update **Assigned → In progress → Quality check → Ready → Delivered**, keeping completion date and delivery status. The linked piece stays unavailable for a second sale.
- **Rentals** starts from an available piece and stores the customer, booking date, rental and return dates, amount, advance and balance. The team records **Booked → Issued → Returned → Inspected → Available**, with damage or late charges when applicable. Issue removes the piece from availability. Inspection restores availability when eligible.
- In the later **supplier portal**, a vendor opens **My orders** to see their purchase orders, related deliveries and payment status.

## 5. Product and inventory hierarchy

**Product** holds one SKU for the design. **Piece** holds one permanent barcode, such as `TB1000-001`, plus the vendor and receipt. **Location** records where the piece belongs, with an optional shelf/bin. The same SKU may have pieces in several locations. A barcode search opens the history from vendor receipt through transfers, adjustments and sale.

```text
Vendor delivery → Godown 1 (verify, label, shelf) → Godown 2 (receive, distribute)
                                                     ├─→ Shop 1–4 → Billing → Sold
                                                     └─→ WEB stock → Website order → Sold
Direct send from a godown → Select one destination → In transit → Receive
```

Additional godowns, shops and WEB assignments use the same screens. The website pool can have a designated physical shelf at the packing godown. Count those pieces in the WEB pool once, even when the shelf is in the same building as godown stock.

| Stock measure | What it means |
| --- | --- |
| **Available** | Confirmed at a location and free to sell or transfer. |
| **Allocated** | Confirmed pieces assigned to the chosen shop or website pool. The view shows how many are available and how many are on hold or otherwise unavailable. A request records planned demand. |
| **Reserved / Hold** | A piece held for a pending bill, order or booking. Available drops while it is held. |
| **In transit / Incoming** | Dispatched from the source and awaiting receipt at the destination. One piece contributes once to the overall transit count. |
| **Transferred** | Dispatched and received quantities by transfer reference and date. Each location can see its own sent or received history. |
| **Sold** | Pieces from completed sales, reported by sale location/channel and date. |
| **Damaged / Returned** | Separate statuses for pieces awaiting a decision or inspection. Only an eligible return to **Available** raises sellable stock. Rented and stitching pieces also have their own statuses when those flows open. |

At a location, **on hand** counts physical pieces present, including held or quarantined pieces. Show **available**, **on hand** and **incoming** side by side. Closing available equals opening available plus pieces entering **Available** minus pieces leaving it. Counts come from piece states and movement records and can be filtered by SKU, vendor, location or status. Check the current piece state when posting and process each event once. A repeat receipt scan or payment confirmation must leave stock and sales totals as they were after the first successful event.

| Example for one SKU | Godown 2 available | Shop 1 available | WEB available | In transit | Sold |
| --- | ---: | ---: | ---: | ---: | ---: |
| Start after Godown 2 receives 10 | 10 | 0 | 0 | 0 | 0 |
| Shop 1 requests 3 and source approves | 10 | 0 | 0 | 0 | 0 |
| Godown 2 dispatches 3 | 7 | 0 | 0 | 3 | 0 |
| Shop 1 receives the 3 | 7 | 3 | 0 | 0 | 0 |
| Shop 1 sells 1 | 7 | 2 | 0 | 0 | 1 |
| WEB team confirms receipt of 2 more from Godown 2 | 5 | 2 | 2 | 0 | 1 |
| A WEB sale completes for 1 | 5 | 2 | 1 | 0 | 2 |

### Stock counts and adjustments

1. In **Inventory → Stock counts**, choose a location and optionally a SKU or bin. Open the expected piece list and scan what is present. Show counted, missing, unexpected and damaged pieces.
2. Compare differences with transfers, sales and movements since the count started. A count that matches closes with its reference. For a variance, record a reason and send it to the authorized manager or Owner / Admin for one decision.
3. Apply the approved increase or decrease against the relevant codes. An unrecorded vendor delivery goes through **Receive**. A previously missing piece can return to available with its original code after verification. An existing piece found at the wrong location keeps its barcode and gets a documented correction. Missing pieces or write-offs reduce available stock and retain their history.
4. Store expected and counted quantities, affected codes, reason, actor, time, approver and reference. In the example, if four of Godown 2's five available pieces are found and one is confirmed missing, the approved adjustment changes Godown 2 from **5 to 4**. Shop 1, WEB and sold totals stay at their recorded balances.

## 6. Permissions by action

The server checks **action + location + confidential access** for pages, searches, writes and exports. A mixed assignment, such as Godown 2 and Shop 1, can grant distribution actions at the godown and billing actions at the shop. Both ends can see their transfer reference. The source can dispatch, and the destination can receive. A transfer grants visibility to its own records and pieces.

| Function | View | Create and edit | Approve or manage | Export |
| --- | --- | --- | --- | --- |
| **Stock and product details** | Owner / Admin and scoped operations users. Editor reads listing fields. | Owner / Admin edits the master. Receiving staff can set up products when receiving a new SKU. Scoped staff can update permitted shelf assignments. | Owner / Admin manages products and stock settings. | Owner / Admin and Manager Head for granted operational reports. |
| **Vendor receipts and labels** | Owner / Admin and assigned receiving staff. | Receiving staff verify, create and print labels. Authorized users enter purchase values. | Owner / Admin handles receipt corrections and vendor bill exceptions. | Owner / Admin and explicitly authorized users. |
| **Vendors and payables** | Owner / Admin. Receiving staff see supplier selection details. | Owner / Admin maintains vendors and records payments. Receiving staff can add a basic supplier with a grant. | Owner / Admin or delegated confidential payables user. | Authorized confidential users. |
| **Transfers** | Owner / Admin and assigned source/destination users. | Shop Manager creates requests. Authorized godown user creates direct sends and dispatches. Assigned receiving user confirms receipt. Managers can arrange a return transfer with source/destination access as applicable. | Source-side approver approves requests. Scoped Manager Head or Owner / Admin resolves discrepancies. | Owner / Admin and Manager Head within scope. |
| **Counts and adjustments** | Owner / Admin, scoped managers and assigned counters. | Staff create counts and suggest corrections at their location. | Shop Manager at own shop, Manager Head at assigned locations or Owner / Admin approves and posts reasoned differences. | Owner / Admin and Manager Head within scope. |
| **Billing and invoices** | Owner / Admin, scoped managers and salesperson for their own bills. | Authorized shop staff create bills, apply allowed offers and take payments. | Scoped managers or Owner / Admin handle permitted cancellations and reversals. | Owner / Admin and authorized managers. |
| **Online and Instagram orders** | Owner / Admin and authorized channel staff or managers. | Assigned staff enter Instagram orders or update assigned fulfilment. Website checkout creates WEB orders. | Owner / Admin or assigned manager handles cancellation, payment exceptions and order reconciliation. | Owner / Admin and assigned Manager Head with export access. |
| **Offers and GST** | Billing users see applicable prices and offers. Finance settings require a grant. | Owner / Admin sets offers, GST and invoice templates. | Owner / Admin activates offers and manages tax configuration. | GST reports for authorized users. |
| **Catalog** | Owner / Admin and Content Editor. | Both can make listing drafts and edit photos and copy. | Both can publish. Product identity and stock updates follow Inventory permissions. | As granted. |
| **Team and services** | Owner / Admin and scoped managers. Assigned staff see their service work. | Managers maintain staff and attendance. Assigned staff record stitching and rentals when enabled. | Scoped managers approve incentives and resolve service exceptions. | Owner / Admin and authorized managers within scope. |
| **Supplier portal** (later) | Vendor sees their own purchase orders, deliveries and payment status. | Owner / Admin maintains supplier links in Inventory. | Owner / Admin manages which vendor account is linked. | As granted for internal vendor reports. |
| **Reports and audit** | Owner / Admin, Manager Head within scope and Shop Manager for shop operational reports. | Reports derive from the underlying records. | Owner / Admin manages report and confidential access. | Owner / Admin and delegated managers within scope and field permissions. |
| **Locations, accounts and numbering** | Owner / Admin and delegated Setup Admin. | Both can set up and update records within their assigned authority. | Owner / Admin controls privileged access and confidential grants. Setup Admin handles delegated settings. | Owner / Admin or explicitly authorized Setup Admin for permitted setup records. |

**Delete** allows Owner / Admin to remove unused drafts or configuration and delegated Setup Admin to remove unused setup records where allowed. Deactivate products, users, vendors and locations that have history. Use cancellation, reversal or a linked adjustment for posted transactions so invoices, piece codes and audit records stay traceable. **Confidential** governs purchase prices, vendor costs, margins and financial reports even when someone can view product details or export an operational report.

## 7. Sections to merge or remove from navigation

| Current entry or overlap | Destination in the simplified CRM |
| --- | --- |
| **Stock & scan** and **Storage bins** | **Inventory → Stock** opens the scan and shows the shelf on the item. Location setup holds bin layout. |
| **Receive stock**, label printing and SKU selection | **Inventory → Receive** keeps vendor verification, new/restock selection and receipt labels together. **Products** remains the shared master. |
| **Stock requests** plus separate sending and receiving steps | **Inventory → Transfers** with **Request stock**, **Send stock** and **Incoming** on the same transfer workflow. |
| **Billing (POS)**, **Invoices** and **Online orders** sidebar links | **Sales** gives each role its allowed billing, invoice and order pages. An order links to its invoice. |
| **Online catalog** and inventory product entry | Create the product once in **Inventory**. **Catalog** edits its website listing. The Content Editor has a direct **Catalog** link. |
| **Vendors** and **Vendor dues** | **Inventory → Vendors** owns the supplier record and links to receipts, supplier bills, balances and payments for authorized users. |
| **Stores & godowns**, **Roles & permissions**, **Users**, **SKU & numbering**, **GST & invoice** | Group under **Settings** and combine user assignment and roles in **Users & permissions**. |
| Disabled phase links and task lists repeated in several menus | Show released pages to the relevant role. Use Home for due work and link to the record that resolves it. |

## 8. Final navigation flow

```text
Sign in → Home (role + location + next task)
          ├─ Inventory → Stock / Products / Receive / Transfers / Stock counts / Vendors
          ├─ Sales     → Billing / Invoices / Orders / Catalog / Offers / Stitching / Rentals
          ├─ Team      → Staff & attendance / Incentives
          ├─ Reports   → Stock / Sales & GST / Audit history
          └─ Settings  → Locations / Users & permissions / Numbering / GST & invoice
```

Each person gets the sidebar and page access listed in sections 2 and 3. The main handoff is **Receive vendor stock → Dispatch → Receive transfer → Bill or process order → Review stock and sales**. A shop can start the same transfer by requesting stock. Every step links to the previous reference and shows the next responsible role.

### Requirements and rollout

| PDF reference | Where the requirement is carried through |
| --- | --- |
| **pp. 1–4, §§1–10** | Vendor receiving, automatic piece codes, standard and direct transfers, transit, WEB allocation and stock status filters in Inventory. |
| **pp. 5–6, §§11–15** | Shop-scoped POS, discount and GST calculation, offers, daily/monthly sales and GST exports, and protected purchase costs. |
| **pp. 6–7, §§16–18** | Full-access business administrator, receiving and distribution duties, outlet access and configurable permissions. |
| **pp. 8–9, §§19–23** | Stitching and rentals, permanent piece identity, Home summaries and the shop and website sale paths. |
| **pp. 9–10, §§24–25 and key expectation** | Core stock first, billing and GST second, management reporting third, services and live commerce integration fourth. Alerts belong in the task and Home views. Transactions share one inventory, with a traceable reference and audit history. |

The CRM now uses role-specific Home screens and shared Inventory, Sales, Reports and Settings workspaces. Stock counts use the movement history to post approved missing or found pieces. Owner / Admin has business and setup access, and Setup Admin has delegated configuration access. Full checkout fulfilment, offer campaigns, complete report exports, Team and service pages remain later work. [Current navigation](../src/components/admin/nav.ts) · [Role defaults](../src/server/seed/defaults.ts) · [Permission checks](../src/lib/rbac/permissions.ts) · [Remaining work](NEXT_STEPS.md)
