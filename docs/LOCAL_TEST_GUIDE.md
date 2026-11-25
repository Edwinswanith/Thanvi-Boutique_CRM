# Thanvi Boutique local test guide

Use the [CRM](http://127.0.0.1:3000/admin) for staff operations and the [shop](http://127.0.0.1:3000/shop) for the customer view. Use two browser profiles to test staff permissions and the public shop independently. The local Owner account is `owner@thanvi.test`. Its password is the `SEED_OWNER_PASSWORD` value in `.env.local`.

## Follow two physical sarees from delivery to sale

Use a unique product name, such as `QA Silk Saree 01`, so you can distinguish your records from the demo data. Note your starting dashboard numbers, then save the two barcodes, the transfer number and the invoice number as you go.

| Step | What to do | What should be reflected |
| --- | --- | --- |
| 1. Storage | In **Inventory → Storage**, select Godown 1 and create a grid with two racks and two shelves each. | Four bins appear, including `R1-S1`. The bin should be selectable when receiving into that godown. |
| 2. Vendor | In **Inventory → Vendors**, add `QA Weavers 01`. | The vendor appears in the list and can be selected on the receiving form. |
| 3. Receive | In **Inventory → Receive**, select that vendor and Godown 1. Enter a silk saree, HSN `5007`, two pieces, cost ₹600 each and an MRP of ₹1,050. Put the pieces in `R1-S1`. | The receipt produces two distinct piece codes under one SKU. Both show `available` at Godown 1 in the bin. Vendor Payables shows a ₹1,200 bill. |
| Restock | Switch **Product type** to **Restock existing SKU**, enter the SKU from the first receipt, and receive one more piece. | The same SKU gets its next barcode. The new receipt can have its own supplier and purchase price. The original listing and its price stay in place. |
| 4. Labels and lookup | Click **Print barcode labels** on the receipt confirmation. Paste each code into **Inventory → Stock & scan** and press Enter. | The Code 39 label matches the displayed piece code. Lookup shows the product, godown, bin and movement history. Check printed size and a real scanner separately if you have the equipment. |
| 5. Dispatch | In **Transfers**, open **Send stock directly**, set Godown 1 as source and Shop 1 as destination, then scan and send only the first piece. | The first piece goes `in_transit` and is unavailable for sale at either location. The second remains available in the godown. |
| 6. Receive at store | Open the transfer and scan the first piece under **Receive scanned**. | Transfer shows one of one received. The first piece is available at Shop 1 and its history shows the transfer. |
| 7. Bill | In **Billing**, select Shop 1, scan the first code and complete a cash sale. | A closed invoice appears in **Invoices** with the store’s sequence and the billed barcode. The piece shows `sold`. Scanning it again for sale should be rejected. The other piece remains available in the godown. |
| 8. Reconcile | Reload the Owner dashboard for a range that includes today and filter to Shop 1. Then open **Vendor Payables** and record a ₹400 payment against the delivery bill. | The closed sale counts in the relevant store, channel and payment totals. The vendor bill shows ₹400 paid and ₹800 pending. Paying the vendor changes the outstanding balance without changing the customer invoice or piece status. |

Also run the **Request stock** path with a manager assigned to the destination store. Verify that requesting and approving leave stock available at the source, dispatch moves the scanned pieces to `in_transit`, and receipt counts only what was scanned. Try a duplicate scan, a code from the wrong dispatch location and a short receipt on separate test transfers. When a short receipt is finalized, missing pieces stay in transit for investigation. Check the transfer discrepancy and item histories after refreshing the pages.

## CRM feature checklist

| Feature | What it does and how to check it |
| --- | --- |
| Sign-in and role scope | Try a wrong password, then a correct one. Sign out and open `/admin` directly to confirm it redirects to sign-in. Verify a Super Admin sees the setup desk and an Owner sees sales and payables. Verify a manager assigned to Shop 1 sees Shop 1 data. Try opening a restricted page directly as each role. |
| Stores and godowns | The Super Admin creates locations with codes and store details. Create a test store and look for its invoice series and availability in the relevant location selectors. A godown receives and dispatches stock. A store receives transfers and bills customers. |
| Users and roles | The Super Admin creates staff accounts, assigns locations and configures role permissions. Test Manager Head across assigned stores, Manager in one store, Salesperson at billing, Godown Staff in inventory, and Content Editor in the catalog. Vendor portal access is planned. |
| Numbering | The Super Admin configures SKU, vendor, transfer and invoice series. Compare the preview with a newly created test record. Use a fresh prefix when testing SKU changes. Existing codes should stay as issued. |
| Products and stock | Products hold shared details such as SKU, category, HSN and MRP. Pieces carry individual barcodes, status and location. Compare two pieces of the same product after moving or selling just one. |
| POS, discounts and GST | Compare the billing preview with the saved invoice. Try a line discount and a bill discount, inclusive and exclusive GST settings, and intra-state versus inter-state sales where configured. Verify the taxable value, CGST/SGST or IGST, and final total. Use the configured test rules as the expected values. |
| Invoice history and printing | Find the invoice from the invoice list. Compare its saved items, totals and seller details with the sale. Preview A4 and 80 mm layouts. Change a product’s details and confirm the issued invoice retains its original values. |
| Payments | Test cash, UPI and card with different pieces and check the invoice status and dashboard payment breakdown. Staff-operated Razorpay links require test-mode keys and a reachable signed webhook. Verify open invoice and reserved piece before payment, then paid invoice and sold piece after confirmation. |
| Vendor payables | Each receipt with cost raises a vendor bill. Test a partial payment, the final balance and an attempted overpayment. Check billed, paid, pending and overdue figures against the bill details. |
| Dashboard | Compare 7-, 30- and 90-day figures against the sample sales and your new closed invoice. Check store, channel, salesperson, product and payment breakdowns, the sales forecast, pending payments and live stock. Compare manager and owner views for location scope and margin visibility. |
| Audit trail | Material actions are logged with user, time, reference and change details. Use piece history to verify stock movement visible in the UI. Broader audit records are server-side. |

For manual setup tests, sign in as `setup@thanvi.test` with the `SEED_SUPERADMIN_PASSWORD` value in `.env.local`. Use that account to create additional location-scoped accounts and sign in as them in a separate browser profile. The automated browser suite uses its own database and accounts.

## Verify that CRM catalog changes reach the shop

1. In **Admin → Online catalog**, open an existing demo product such as Raga Silk Saree. Open its public product page in a separate tab.
2. Change its short description, save and reload the public page. Confirm the saved description appears and the price matches the product MRP. Test cover photo, photo order, collection, featured placement and SEO fields separately.
3. Unpublish the listing. Confirm it disappears from the collection and its public URL returns 404. Try publishing with a missing required field and verify the checklist blocks it. Restore the field, publish again and confirm the page returns.
4. From the shop, browse by fabric, change the sort, view and zoom photos, and add a product from both its card and its detail page. Change bag quantity, check subtotal, reload the page, and remove the item. Unpublish an item already in the bag and reopen the bag to check the stale listing is removed.
5. Open `/robots.txt`, `/sitemap.xml` and `/llms.txt`. Verify published products appear where expected, unpublished products disappear, and private pages stay out of search. On a product page, verify the product name and price in metadata agree with the page.

For test checkout, transfer a published product's barcode to **WEB · E-Commerce**, then scan it in at the destination. Add it to the bag and check that stock stays the same. Proceed to **Checkout**, enter sample delivery details, and choose **Dummy online payment** or **Cash on delivery**. Click **Review shipping and GST**, confirm the breakdown, then click **Place test order**. Delivery inside the configured seller state shows CGST and SGST. Delivery outside it shows IGST when tax applies. Shipping defaults to ₹0 and can be configured with the test environment values in `.env.example`.

The order should appear in **CRM → Online orders**, the purchased barcode should show **Sold**, and available WEB stock should fall by the ordered quantity. Open **View test invoice** after checkout or **Test invoice** in the CRM to see the saved breakdown and print it. Test orders made before the breakdown was added retain their original totals and have no test invoice link. On the Owner dashboard, **Website orders** reports paid website invoices separately from dummy payments, test COD, and cancellations. Test checkout amounts stay out of sales revenue.

Click **Cancel order** in **CRM → Online orders** and confirm. The order should show **Cancelled** and the same barcodes should be **Available** at WEB again. Dummy payment records remain visible for test history. Live payments, shipping fulfilment, and live customer tax invoicing remain pending. The [project roadmap](NEXT_STEPS.md) covers further improvements.

For each test, record the account, barcode or record ID, expected result, actual result and a screenshot when they differ. Reopen the affected pages after refreshing to check that the change persisted and appears in all relevant views.
