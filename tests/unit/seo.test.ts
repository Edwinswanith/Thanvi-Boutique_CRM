import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "@/lib/storefront/collections";
import { COLLECTION_GUIDES, guideFor } from "@/lib/seo/guides";
import { breadcrumbJsonLd, collectionJsonLd, faqJsonLd, organizationJsonLd, productFaq, productJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, SITE, siteUrl } from "@/lib/seo/site";

const product = {
  slug: "raga-silk-warm-blue", title: "Raga Silk Saree", collection: "silk" as const, colour: "Warm Blue", price: 135_000,
  photos: ["/api/media/abc", "/api/media/def"], shortDescription: "Featherlight raga silk.", featured: false,
  description: "A handwoven raga silk saree.\n\nWear it for festivals.", highlights: ["Handloom"], care: "Dry clean only.",
  seo: { title: "Raga Silk Saree | Thanvi Boutique", description: "Featherlight raga silk." },
};

describe("site", () => {
  it("builds absolute URLs from the configured site URL", () => {
    expect(siteUrl()).toMatch(/^https?:\/\//);
    expect(siteUrl().endsWith("/")).toBe(false);
    expect(absoluteUrl("/shop")).toBe(`${siteUrl()}/shop`);
    expect(absoluteUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
});

describe("structured data", () => {
  it("describes the business as an Organization + ClothingStore without invented addresses", () => {
    const org = organizationJsonLd();
    expect(org["@type"]).toEqual(["Organization", "ClothingStore"]);
    expect(org.foundingDate).toBe("2016");
    expect(org.logo).toBe(absoluteUrl("/brand/thanvi-logo.png"));
    expect(JSON.stringify(org)).not.toContain("undefined");
    expect(websiteJsonLd().url).toBe(absoluteUrl("/shop"));
  });

  it("marks up a product with absolute images, INR price, brand and the exchange-only policy", () => {
    const ld = productJsonLd(product);
    expect(ld).toMatchObject({ "@type": "Product", name: "Raga Silk Saree", material: "Silk", color: "Warm Blue", url: absoluteUrl("/shop/sarees/raga-silk-warm-blue") });
    expect(ld.image).toEqual([absoluteUrl("/api/media/abc"), absoluteUrl("/api/media/def")]);
    expect(ld.offers).toMatchObject({ "@type": "Offer", price: "1350.00", priceCurrency: "INR", availability: "https://schema.org/InStock" });
    expect(ld.offers.hasMerchantReturnPolicy.refundType).toBe("https://schema.org/ExchangeRefund");
  });

  it("builds breadcrumbs, collection item lists and FAQ pages", () => {
    const crumbs = breadcrumbJsonLd([{ name: "Home", path: "/shop" }, { name: "Silk", path: "/shop/sarees?fabric=silk" }]);
    expect(crumbs.itemListElement[1]).toMatchObject({ position: 2, name: "Silk", item: absoluteUrl("/shop/sarees?fabric=silk") });
    const list = collectionJsonLd("Silk sarees", "/shop/sarees?fabric=silk", [product]);
    expect(list.mainEntity.numberOfItems).toBe(1);
    expect(list.mainEntity.itemListElement[0].url).toBe(absoluteUrl("/shop/sarees/raga-silk-warm-blue"));
    const faq = faqJsonLd([{ q: "Q?", a: "A." }]);
    expect(faq.mainEntity[0]).toEqual({ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } });
  });

  it("escapes </script> so content can't break out of the JSON-LD tag", () => {
    expect(toJsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("answer-engine content", () => {
  it("has a guide with real FAQs for every collection", () => {
    for (const c of COLLECTIONS) {
      const g = guideFor(c.key);
      expect(g, c.key).toBeDefined();
      expect(g!.intro.length).toBeGreaterThan(80);
      expect(g!.faqs.length).toBeGreaterThanOrEqual(3);
      expect(g!.seoTitle.length).toBeLessThanOrEqual(65);
      expect(g!.seoDescription.length).toBeLessThanOrEqual(160);
    }
    expect(Object.keys(COLLECTION_GUIDES)).toHaveLength(COLLECTIONS.length);
  });

  it("answers the questions shoppers and AI assistants ask about a product", () => {
    const faqs = productFaq(product);
    const qs = faqs.map((f) => f.q);
    expect(qs).toContain("What is the price of the Raga Silk Saree?");
    expect(faqs.find((f) => f.q.startsWith("What is the price"))!.a).toContain("₹1,350");
    expect(qs.some((q) => q.includes("care"))).toBe(true);
    expect(faqs.some((f) => /exchange/i.test(f.a))).toBe(true);
    expect(faqs.some((f) => SITE.cities.every((city) => f.a.includes(city)))).toBe(true);
  });
});
