import { describe, expect, it } from "vitest";
import { GET as llms } from "@/app/llms.txt/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { absoluteUrl } from "@/lib/seo/site";
import { Product } from "@/models/Product";
import { Vendor } from "@/models/Vendor";
import { saveListing, setPublished } from "@/server/services/catalog";
import { savePhoto } from "@/server/services/files";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function publish(slug: string, title: string, collection: string, publishIt = true) {
  const editor = await actorWithRole("content-editor");
  const vendor = await Vendor.findOneAndUpdate({ code: "KW1" }, { $setOnInsert: { code: "KW1", name: "Weavers" } }, { upsert: true, returnDocument: "after" });
  const p = await Product.create({ sku: `TB${slug.length}${Date.now() % 100000}`, name: title, category: "Saree", hsn: "5007", mrp: 245_000, vendorId: vendor!._id });
  const photo = await savePhoto(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "a.jpg", { type: "image/jpeg" }), editor.id);
  await saveListing(editor, String(p._id), {
    slug, title, collection, colour: "Teal", shortDescription: "Light as air.", description: "A handwoven saree with a fine border, made for long festive days.",
    highlights: [], care: "", photoIds: [photo], seoTitle: "", seoDescription: "", featured: false,
  });
  if (publishIt) await setPublished(editor, String(p._id), true);
}

describe("crawl files", () => {
  it("robots.txt welcomes search and AI crawlers to the shop but not the back office", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const ai = rules.find((x) => Array.isArray(x.userAgent) && x.userAgent.includes("GPTBot"));
    expect(ai?.userAgent).toEqual(expect.arrayContaining(["OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Bingbot"]));
    for (const rule of rules) {
      expect(rule.allow).toContain("/shop");
      expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/api/", "/shop/bag"]));
    }
    expect(r.sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });

  it("sitemap lists only live products, their photos and live collections", async () => {
    await publish("kota-teal", "Kota Teal Saree", "kota");
    await publish("draft-silk", "Draft Silk", "silk", false);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(absoluteUrl("/shop/sarees/kota-teal"));
    expect(urls).toContain(absoluteUrl("/shop/sarees?fabric=kota"));
    expect(urls).not.toContain(absoluteUrl("/shop/sarees/draft-silk"));
    expect(urls).not.toContain(absoluteUrl("/shop/sarees?fabric=silk"));
    const entry = (await sitemap()).find((e) => e.url.endsWith("/kota-teal"));
    expect(entry?.images?.[0]).toMatch(/^https?:\/\/.+\/api\/media\/[a-f0-9]{24}$/);
  });

  it("llms.txt summarises the business and every live saree in markdown", async () => {
    await publish("kota-teal", "Kota Teal Saree", "kota");
    await publish("draft-silk", "Draft Silk", "silk", false);
    const res = await llms();
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const text = await res.text();
    expect(text).toMatch(/^# Thanvi Boutique/);
    expect(text).toContain("Chennai, Madurai, Karaikudi, Coimbatore");
    expect(text).toContain(`[Kota Teal Saree](${absoluteUrl("/shop/sarees/kota-teal")}): Kota saree, Teal, ₹2,450 — Light as air.`);
    expect(text).toContain("[Kota sarees]");
    expect(text).not.toContain("Draft Silk");
    expect(text).toContain("Exchange only");
  });
});
