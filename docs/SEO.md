# Search & AI visibility (SEO · GEO · AEO)

Goal: when someone searches Google/Bing — or asks ChatGPT, Perplexity, Gemini, Claude or another AI agent — for sarees like ours ("Kota sarees for summer", "where to buy silk sarees in Chennai"), Thanvi Boutique should be found, understood and quoted.

No site can guarantee rankings or AI citations; they also depend on domain age, links, reviews and Google Business Profiles (see *Client checklist*). The site now does everything on its side.

## What the site does

| Area | What's built | Where |
|---|---|---|
| **SEO — technical** | Server-rendered pages, unique title/description per page, canonical URLs (sort order never creates duplicates), `en-IN`, Open Graph + Twitter cards, descriptive image alt text, real 404s, `noindex` on bag/login/admin, root `/` → `/shop` (308) | `src/app/shop/**`, `src/app/layout.tsx` |
| **SEO — crawl** | `robots.txt` (allows shop + product photos, blocks admin/API/bag), dynamic `sitemap.xml` with product image entries, updated on publish | `src/app/robots.ts`, `src/app/sitemap.ts` |
| **Structured data** | `Organization` + `ClothingStore`, `WebSite`, `Product` (INR price, brand, material, colour, images, exchange-only `MerchantReturnPolicy`), `BreadcrumbList`, `CollectionPage`/`ItemList`, `FAQPage`, `AboutPage` | `src/lib/seo/jsonld.ts` |
| **GEO** (generative engines) | Search **and** AI crawlers explicitly allowed (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended, Applebot-Extended, Bingbot, CCBot…); `/llms.txt` — a live markdown summary of the business, fabrics and every saree with price; a factual About page | `src/app/robots.ts`, `src/app/llms.txt/route.ts`, `/shop/about` |
| **AEO** (answer engines) | Each fabric page has a guide + FAQ ("What is a Kota saree?", "Are cotton sarees good for summer?"); each product page answers price / fabric / care / exchange / try-in-store questions; About page FAQ. All visible on the page *and* in `FAQPage` markup | `src/lib/seo/guides.ts`, `productFaq()` |

Content editors control product titles, descriptions and search text in *Admin → Online catalog* (see [CONTENT_GUIDE.md](CONTENT_GUIDE.md)). Good, specific copy is the single biggest lever: fabric, weave, origin, occasion, care.

## Configuration
- `NEXT_PUBLIC_SITE_URL` — the live domain, e.g. `https://thanviboutique.com`. **Must be set in production**; it drives canonicals, sitemap, structured data and llms.txt (defaults to `http://localhost:3000`).
- Business facts: `src/lib/seo/site.ts`.

## Client checklist (only they can do these)
1. **Store details** in `src/lib/seo/site.ts`: street address, postcode, phone and hours per store; Instagram/Facebook/YouTube URLs; the exchange window in days. These are left blank rather than guessed.
2. **Google Search Console** and **Bing Webmaster Tools** (ChatGPT search uses Bing's index): verify the domain and submit `/sitemap.xml`.
3. **Google Business Profile** for each store (Chennai, Madurai, Karaikudi, Coimbatore), using the same name, address and phone as the website. Ask happy customers for reviews.
4. **Google Merchant Center** (free listings in Google Shopping) — a product feed can be generated from the same data later.
5. **Avoid duplicate content:** if the Shopify site stays live on another domain, don't copy its descriptions word for word; decide which domain is canonical before launch.
6. **Remove demo content** before launch (`npm run seed:demo -- --remove`) and write original descriptions.
