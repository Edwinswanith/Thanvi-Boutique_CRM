import { expect, test, type Page } from "@playwright/test";

async function jsonLdTypes(page: Page): Promise<string[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => {
    const t = (JSON.parse(b) as { "@type": string | string[] })["@type"];
    return Array.isArray(t) ? t : [t];
  });
}

test("the domain root opens the shop", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/shop$/);
});

test("robots.txt, sitemap.xml and llms.txt are served for crawlers and AI agents", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("GPTBot");
  expect(robots).toContain("PerplexityBot");
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/shop/sarees/pochampally-pattu-cadet-grey</loc>");
  expect(sitemap).toContain("<image:loc>");

  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/markdown");
  expect(await llms.text()).toContain("[Pochampally Pattu Saree]");
});

test("product pages carry Product, Breadcrumb and FAQ data that matches the page", async ({ page }) => {
  await page.goto("/shop/sarees/pochampally-pattu-cadet-grey");
  const types = await jsonLdTypes(page);
  expect(types).toEqual(expect.arrayContaining(["Organization", "ClothingStore", "WebSite", "Product", "BreadcrumbList", "FAQPage"]));
  const product = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map((b) => JSON.parse(b) as { "@type": string; offers?: { price: string; priceCurrency: string } })
    .find((d) => d["@type"] === "Product");
  expect(product?.offers).toMatchObject({ price: "3450.00", priceCurrency: "INR" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/shop\/sarees\/pochampally-pattu-cadet-grey$/);
  await expect(page.getByRole("heading", { name: "What is the price of the Pochampally Pattu Saree?" })).toBeVisible();
  await expect(page).toHaveTitle(/Pochampally Pattu Saree/);
});

test("fabric pages have their own title, a guide with FAQs and a sort-free canonical", async ({ page }) => {
  await page.goto("/shop/sarees?fabric=kota&sort=price-asc");
  await expect(page).toHaveTitle(/Kota Sarees Online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/shop\/sarees\?fabric=kota$/);
  await expect(page.getByRole("heading", { name: "What is a Kota saree?" })).toBeVisible();
  expect(await jsonLdTypes(page)).toEqual(expect.arrayContaining(["CollectionPage", "FAQPage", "BreadcrumbList"]));
});

test("private pages are kept out of search", async ({ page }) => {
  await page.goto("/shop/bag");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/shop/about");
  await expect(page.getByRole("heading", { name: "Where are Thanvi Boutique's stores?" })).toBeVisible();
});
