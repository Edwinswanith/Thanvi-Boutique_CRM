import { handleError } from "@/lib/api";
import { guideFor } from "@/lib/seo/guides";
import { absoluteUrl, SITE } from "@/lib/seo/site";
import { collectionLabel, COLLECTIONS, formatPrice } from "@/lib/storefront/collections";
import { liveCollections, publishedForIndex } from "@/server/services/storefront";

export const dynamic = "force-dynamic";

const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

/**
 * /llms.txt — a plain-markdown summary of the business and catalogue for AI
 * assistants and agents (llmstxt.org convention). Generated from live data.
 */
export async function GET(): Promise<Response> {
  try {
    const [products, live] = await Promise.all([publishedForIndex(), liveCollections()]);
    const liveKeys = new Set(live.map((c) => c.key));
    const lines = [
      `# ${SITE.name}`,
      "",
      `> ${SITE.description}`,
      "",
      `- Founded: ${SITE.foundingYear}`,
      `- Stores: ${SITE.cities.join(", ")} (Tamil Nadu, India)`,
      `- Sells: handloom sarees online across India; prices in ${SITE.currency}, set by MRP`,
      `- Returns: ${SITE.returnPolicy}`,
      `- Website: ${absoluteUrl("/shop")}`,
      "",
      "## Shop by fabric",
      "",
      `- [All sarees](${absoluteUrl("/shop/sarees")}): the full online collection`,
      ...COLLECTIONS.filter((c) => liveKeys.has(c.key)).map((c) => `- [${c.label} sarees](${absoluteUrl(`/shop/sarees?fabric=${c.key}`)}): ${firstSentence(guideFor(c.key)?.intro ?? c.blurb)}`),
      "",
      "## Sarees",
      "",
      ...products.map((p) => `- [${p.title}](${absoluteUrl(`/shop/sarees/${p.slug}`)}): ${[p.collection ? `${collectionLabel(p.collection)} saree` : "Saree", p.colour, formatPrice(p.price)].filter(Boolean).join(", ")}${p.shortDescription ? ` — ${p.shortDescription}` : ""}`),
      "",
      "## About",
      "",
      `- [About ${SITE.name}](${absoluteUrl("/shop/about")}): who we are, stores, policies and FAQs`,
      "",
    ];
    return new Response(lines.join("\n"), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return handleError(err);
  }
}
