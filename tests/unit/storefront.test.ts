import { describe, expect, it } from "vitest";
import { addLine, cartCount, cartSubtotal, MAX_QTY, parseCart, refreshLines, removeLine, setQty, type CartItem } from "@/lib/storefront/cart";
import { COLLECTIONS, formatPrice, guessCollection, isCollectionKey, slugify } from "@/lib/storefront/collections";
import { canPublish, effectiveSeo, publishChecklist, type ListingContent } from "@/lib/storefront/listing";

const item = (slug: string, price = 100_000): CartItem => ({ slug, title: slug.toUpperCase(), price, image: `/api/media/${slug}`, colour: "Red", collection: "Silk" });

describe("collections & formatting", () => {
  it("knows its collections", () => {
    expect(COLLECTIONS.length).toBe(11);
    expect(isCollectionKey("silk")).toBe(true);
    expect(isCollectionKey("polyester")).toBe(false);
  });

  it("guesses a collection from free text, most specific first", () => {
    expect(guessCollection("Matka Organza")).toBe("organza");
    expect(guessCollection("kotta cotton")).toBe("kota");
    expect(guessCollection("Georgette")).toBe("chiffon");
    expect(guessCollection("Silk saree")).toBe("silk");
    expect(guessCollection("Velvet")).toBe("");
  });

  it("makes clean slugs and whole-rupee prices", () => {
    expect(slugify("Raga Silk Saree  — Warm Blue!")).toBe("raga-silk-saree-warm-blue");
    expect(slugify("Rashmika 3.0 Saree")).toBe("rashmika-30-saree");
    expect(formatPrice(1_750_000)).toBe("₹17,500");
    expect(formatPrice(109_900)).toBe("₹1,099");
  });
});

describe("publishing rules", () => {
  const base: ListingContent = {
    slug: "raga-silk", title: "Raga Silk Saree", collection: "silk", colour: "Blue", shortDescription: "",
    description: "A handwoven raga silk saree with a contrast border for festive days.", highlights: [], care: "",
    photoIds: ["a"], seoTitle: "", seoDescription: "", featured: false,
  };

  it("requires title, URL, collection, a photo and a real description", () => {
    expect(canPublish(base)).toBe(true);
    expect(canPublish({ ...base, photoIds: [] })).toBe(false);
    expect(canPublish({ ...base, collection: "" })).toBe(false);
    expect(canPublish({ ...base, description: "short" })).toBe(false);
    const tips = publishChecklist(base).filter((c) => !c.required && !c.ok).map((c) => c.key);
    expect(tips).toEqual(["photos3", "short", "seo"]);
  });

  it("falls back to title and description for search, trimmed to Google's length", () => {
    const seo = effectiveSeo({ ...base, description: "x".repeat(300) });
    expect(seo.title).toBe("Raga Silk Saree | Thanvi Boutique");
    expect(seo.description.length).toBe(155);
    expect(seo.description.endsWith("…")).toBe(true);
    expect(effectiveSeo({ ...base, seoTitle: "Custom", seoDescription: "Desc" })).toEqual({ title: "Custom", description: "Desc" });
  });
});

describe("bag", () => {
  it("adds, merges and caps quantities without mutating", () => {
    const one = addLine([], item("a"));
    expect(one).toMatchObject([{ slug: "a", qty: 1, price: 100_000 }]);
    const merged = addLine(one, item("a"), 2);
    expect(merged[0].qty).toBe(3);
    expect(one[0].qty).toBe(1);
    expect(addLine(merged, item("a"), 99)[0].qty).toBe(MAX_QTY);
  });

  it("sets, removes, counts and totals", () => {
    const lines = addLine(addLine([], item("a", 100_000)), item("b", 250_000), 2);
    expect(setQty(lines, "b", 4).find((l) => l.slug === "b")?.qty).toBe(4);
    expect(setQty(lines, "b", 0).map((l) => l.slug)).toEqual(["a"]);
    expect(removeLine(lines, "a").map((l) => l.slug)).toEqual(["b"]);
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toBe(600_000);
  });

  it("refreshes prices from the live site and drops pieces no longer listed", () => {
    const lines = addLine(addLine([], item("a", 100_000)), item("gone"));
    const { lines: fresh, removed } = refreshLines(lines, [{ ...item("a", 120_000), title: "A new" }]);
    expect(fresh).toMatchObject([{ slug: "a", price: 120_000, title: "A new", qty: 1 }]);
    expect(removed).toEqual(["GONE"]);
  });

  it("parses stored bags defensively", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    const stored = JSON.stringify([{ ...item("a"), qty: 2 }, { slug: 5 }, { ...item("b"), qty: -1 }, { ...item("c"), qty: 50 }]);
    expect(parseCart(stored).map((l) => [l.slug, l.qty])).toEqual([["a", 2], ["c", MAX_QTY]]);
  });
});
