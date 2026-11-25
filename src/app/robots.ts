import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";

/**
 * Search engines AND AI crawlers are explicitly welcome on the shop, so the
 * sarees can appear in Google/Bing results and in ChatGPT, Perplexity, Claude,
 * Gemini and Apple answers. The back office, APIs and bag stay out.
 */
const AI_AND_SEARCH_AGENTS = [
  "Googlebot", "Bingbot", "Google-Extended", "Applebot", "Applebot-Extended",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "CCBot", "DuckAssistBot", "meta-externalagent",
];

const ALLOW = ["/shop", "/api/media/", "/brand/", "/llms.txt"];
const DISALLOW = ["/admin", "/login", "/api/", "/shop/bag", "/shop/checkout", "/shop/invoice/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_AGENTS, allow: ALLOW, disallow: DISALLOW },
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
