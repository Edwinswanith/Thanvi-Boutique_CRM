import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/rbac/permissions";
import { Product } from "@/models/Product";
import { Vendor } from "@/models/Vendor";
import { getListingEditor, listCatalog, saveListing, setPublished } from "@/server/services/catalog";
import { savePhoto } from "@/server/services/files";
import { getPublishedBySlug, isPublishedPhoto, listPublished, liveCollections, publishedBySlugs, relatedPublished } from "@/server/services/storefront";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

async function product(name: string, mrp: number, extra: Record<string, unknown> = {}) {
  const vendor = await Vendor.findOneAndUpdate({ code: "KW1" }, { $setOnInsert: { code: "KW1", name: "Kanchi Weavers" } }, { upsert: true, returnDocument: "after" });
  const p = await Product.create({ sku: `TB${Math.floor(Math.random() * 1e6)}`, name, category: "Saree", hsn: "5007", mrp, vendorId: vendor!._id, ...extra });
  return String(p._id);
}

async function photo(editorId: string): Promise<string> {
  return savePhoto(new File([JPEG], "a.jpg", { type: "image/jpeg" }), editorId);
}

const DESCRIPTION = "A handwoven silk saree with a contrast pallu and a fine zari border, made for festive days.";

function content(overrides: Record<string, unknown> = {}) {
  return {
    slug: "raga-silk-warm-blue", title: "Raga Silk Saree", collection: "silk", colour: "Warm Blue",
    shortDescription: "Featherlight raga silk.", description: DESCRIPTION, highlights: ["Handloom", "Zari border"],
    care: "Dry clean only.", photoIds: [] as string[], seoTitle: "", seoDescription: "", featured: false, ...overrides,
  };
}

describe("roles", () => {
  it("Content Editor manages the catalog but sees no stock or sales; Super Admin can't touch it", async () => {
    const editor = await actorWithRole("content-editor");
    expect(hasPermission(editor.role, "catalog.approve")).toBe(true);
    expect(hasPermission(editor.role, "inventory.view")).toBe(false);
    expect(hasPermission(editor.role, "sales.view")).toBe(false);
    const sa = await actorWithRole("super-admin");
    expect(hasPermission(sa.role, "catalog.view")).toBe(false);
    const owner = await actorWithRole("owner");
    expect(hasPermission(owner.role, "catalog.delete")).toBe(true);
  });
});

describe("catalog editor", () => {
  it("prefills a new listing from the product", async () => {
    const editor = await actorWithRole("content-editor");
    const id = await product("Raga Silk Saree", 135_000, { color: "Warm Blue", fabric: "Raga silk", description: "From the godown." });
    const view = await getListingEditor(editor, id);
    expect(view.exists).toBe(false);
    expect(view.status).toBe("unlisted");
    expect(view.content.title).toBe("Raga Silk Saree");
    expect(view.content.colour).toBe("Warm Blue");
    expect(view.content.collection).toBe("silk");
    expect(view.content.slug).toBe("raga-silk-saree-warm-blue");
    expect(view.product.mrp).toBe(135_000);
  });

  it("saves a draft, rejects duplicate addresses and unknown photos", async () => {
    const editor = await actorWithRole("content-editor");
    const a = await product("Raga Silk Saree", 135_000);
    const b = await product("Other Saree", 99_000);
    const saved = await saveListing(editor, a, content());
    expect(saved.status).toBe("draft");
    await expect(saveListing(editor, b, content())).rejects.toMatchObject({ status: 409 });
    await expect(saveListing(editor, b, content({ slug: "other", photoIds: ["0123456789abcdef01234567"] }))).rejects.toMatchObject({ status: 422 });
    await expect(saveListing(editor, b, content({ slug: "Bad Slug!" }))).rejects.toThrow();
  });

  it("only publishes complete listings, and the shop shows only published ones", async () => {
    const editor = await actorWithRole("content-editor");
    const id = await product("Raga Silk Saree", 135_000);
    await saveListing(editor, id, content({ description: "too short" }));
    await expect(setPublished(editor, id, true)).rejects.toMatchObject({ status: 422 });
    expect(await listPublished()).toHaveLength(0);

    const pic = await photo(editor.id);
    await saveListing(editor, id, content({ photoIds: [pic] }));
    expect(await isPublishedPhoto(pic)).toBe(false);
    const live = await setPublished(editor, id, true);
    expect(live.status).toBe("published");
    expect(await isPublishedPhoto(pic)).toBe(true);

    const shop = await listPublished();
    expect(shop).toHaveLength(1);
    expect(shop[0]).toMatchObject({ slug: "raga-silk-warm-blue", price: 135_000, photos: [`/api/media/${pic}`] });
    const detail = await getPublishedBySlug("raga-silk-warm-blue");
    expect(detail?.highlights).toEqual(["Handloom", "Zari border"]);
    expect(detail?.seo.title).toBe("Raga Silk Saree | Thanvi Boutique");

    await expect(saveListing(editor, id, content({ photoIds: [] }))).rejects.toMatchObject({ status: 422 });
    await setPublished(editor, id, false);
    expect(await listPublished()).toHaveLength(0);
    expect(await getPublishedBySlug("raga-silk-warm-blue")).toBeNull();
    expect(await isPublishedPhoto(pic)).toBe(false);
  });

  it("price follows the product MRP, not the listing", async () => {
    const editor = await actorWithRole("content-editor");
    const id = await product("Raga Silk Saree", 135_000);
    await saveListing(editor, id, content({ photoIds: [await photo(editor.id)] }));
    await setPublished(editor, id, true);
    await Product.updateOne({ _id: id }, { mrp: 150_000 });
    expect((await getPublishedBySlug("raga-silk-warm-blue"))?.price).toBe(150_000);
  });

  it("lists products with their listing status and counts", async () => {
    const editor = await actorWithRole("content-editor");
    const a = await product("Raga Silk Saree", 135_000);
    await product("Kota Cotton Saree", 115_000);
    await saveListing(editor, a, content({ photoIds: [await photo(editor.id)] }));
    await setPublished(editor, a, true);
    const all = await listCatalog(editor, { q: "", status: "all" });
    expect(all.counts).toEqual({ all: 2, published: 1, draft: 0, unlisted: 1 });
    expect((await listCatalog(editor, { q: "", status: "unlisted" })).rows.map((r) => r.name)).toEqual(["Kota Cotton Saree"]);
    expect((await listCatalog(editor, { q: "raga", status: "all" })).rows).toHaveLength(1);
  });
});

describe("storefront queries", () => {
  it("filters by collection, sorts by price and suggests related pieces", async () => {
    const editor = await actorWithRole("content-editor");
    const pic = await photo(editor.id);
    const items: [string, string, number][] = [["Silk A", "silk", 300_000], ["Silk B", "silk", 100_000], ["Cotton C", "cotton", 200_000]];
    for (const [name, collection, mrp] of items) {
      const id = await product(name, mrp);
      await saveListing(editor, id, content({ slug: name.toLowerCase().replace(" ", "-"), title: name, collection, photoIds: [pic], featured: name === "Cotton C" }));
      await setPublished(editor, id, true);
    }
    expect((await listPublished({ collection: "silk" })).map((p) => p.title).sort()).toEqual(["Silk A", "Silk B"]);
    expect((await listPublished({ sort: "price-asc" })).map((p) => p.price)).toEqual([100_000, 200_000, 300_000]);
    expect((await listPublished())[0].title).toBe("Cotton C");
    expect((await relatedPublished("silk-a", 2))[0].title).toBe("Silk B");
  });
});

describe("storefront helpers", () => {
  it("reports live collections with a cover and refreshes bag lines by slug", async () => {
    const editor = await actorWithRole("content-editor");
    const pic = await photo(editor.id);
    const live = await product("Silk Live", 200_000);
    await saveListing(editor, live, content({ slug: "silk-live", title: "Silk Live", photoIds: [pic] }));
    await setPublished(editor, live, true);
    const draft = await product("Cotton Draft", 100_000);
    await saveListing(editor, draft, content({ slug: "cotton-draft", title: "Cotton Draft", collection: "cotton" }));

    expect(await liveCollections()).toEqual([{ key: "silk", cover: `/api/media/${pic}` }]);
    const fresh = await publishedBySlugs(["silk-live", "cotton-draft", "BAD SLUG", "silk-live"]);
    expect(fresh).toEqual([{ slug: "silk-live", title: "Silk Live", price: 200_000, image: `/api/media/${pic}`, colour: "Warm Blue", collection: "Silk" }]);
    expect(await publishedBySlugs([])).toEqual([]);
    expect(await getPublishedBySlug("../etc")).toBeNull();
    expect(await isPublishedPhoto("not-an-id")).toBe(false);
  });
});
