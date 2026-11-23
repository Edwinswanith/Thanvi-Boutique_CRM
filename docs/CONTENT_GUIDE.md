# Website content guide

How products, photos and copy get onto the Thanvi Boutique website, and who does what.

## The flow

1. **Received into stock (godown).** When a vendor delivery arrives, Godown Staff receive it in *Inventory → Receive*. The saree gets a SKU, an MRP, per-piece barcode codes and a quick phone photo. It now exists as a product but is **not on the website**.
2. **Write & photograph (content editor).** In *Admin → Online catalog*, the product shows as **Not on website**. Open it, then:
   - **Photos:** drag in studio shots (or tap *Add photos* on a phone). The first photo is the cover; drag, or use ← → ★, to reorder. Up to 10 photos, JPEG/PNG/WebP, 5 MB each, portrait 3:4 looks best. Photos taken at receiving are offered as a starting point.
   - **Product details:** title, web address (fills in from the title), collection (Silk, Cotton, Linen…), colour, and *Feature on the website*.
   - **Description:** a one-line short description, the full description (blank line between paragraphs), highlights (bullet points) and care instructions.
   - **Search & sharing:** the title and description Google and WhatsApp previews show. Left blank, the product title and description are used. The live Google preview shows exactly what people will see.
   - **Save draft** (or ⌘/Ctrl + S). Drafts are never visible to shoppers.
3. **Publish (content editor or manager).** The checklist on the right must be all green for the required items (title, web address, collection, a photo, a 40+ character description). Press **Publish** and it's live immediately. **Unpublish** hides it again at any time; edits to a live listing go live when saved.

## Who can do what

| Role | Online catalog |
|---|---|
| Owner | Everything |
| Manager Head | Edit and publish |
| **Content Editor** (new) | Edit and publish; sees no stock counts, costs, sales or invoices |
| Others | No access, unless the Owner adds it in *Settings → Roles* |

Publishing is a separate permission (`catalog.approve`). To have one person write and another approve, remove *Approve* from the Content Editor role in *Roles & permissions*.

## Rules the system enforces
- **Price always comes from the product's MRP.** It can't be typed into the listing, so the website and the shop counter never disagree.
- Each web address is unique; changing it on a live product breaks links already shared (the editor warns you).
- A live listing can't be saved incomplete. Unpublish it first.
- Only photos used by a **published** listing are publicly reachable. Drafts and internal stock photos stay private.
- Every save, publish and unpublish is recorded in the audit log (who, when, before and after).

## Demo content
The 28 sarees on the preview site come from thanviboutique.com with **sample copy**. They are flagged as demo data:

```bash
npm run seed:demo              # add them (skips any already there)
npm run seed:demo -- --remove  # remove all demo products, listings and photos before go-live
```
