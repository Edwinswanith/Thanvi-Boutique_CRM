import { expect, test } from "@playwright/test";

test("shopper browses silk, adds a saree to the bag and sees the subtotal", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: /Wrap yourself/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Shop by fabric" }).getByRole("link", { name: "Silk" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Silk sarees" })).toBeVisible();
  await page.getByRole("link", { name: "Price: high to low" }).click();
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect(page.getByTestId("product-card").first()).toContainText("Pochampally Pattu Saree");

  await page.getByTestId("product-card").first().getByRole("link", { name: /Pochampally Pattu Saree/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pochampally Pattu Saree" })).toBeVisible();
  await page.getByRole("button", { name: "ADD TO BAG" }).click();
  const drawer = page.getByRole("dialog", { name: "Added to your bag" });
  await expect(drawer).toBeVisible();
  await expect(page.getByTestId("bag-count")).toHaveText("1");
  await drawer.getByRole("button", { name: "CONTINUE SHOPPING" }).click();
  await expect(drawer).toBeHidden();

  await page.getByRole("button", { name: "BUY NOW" }).click();
  await expect(page).toHaveURL(/\/shop\/bag$/);
  await expect(page.getByTestId("bag-subtotal")).toHaveText("₹3,450");

  await page.getByRole("button", { name: "One more Pochampally Pattu Saree" }).click();
  await expect(page.getByTestId("bag-subtotal")).toHaveText("₹6,900");
  await page.getByRole("button", { name: "One less Pochampally Pattu Saree" }).click();
  await expect(page.getByTestId("bag-subtotal")).toHaveText("₹3,450");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your bag is empty")).toBeVisible();
});

test("quick add from a product card opens the bag drawer", async ({ page }) => {
  await page.goto("/shop/sarees?fabric=kota");
  await page.getByRole("button", { name: /Add .* to bag/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Added to your bag" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("the shop is public and unknown sarees 404", async ({ page }) => {
  const res = await page.goto("/shop/sarees/does-not-exist");
  expect(res?.status()).toBe(404);
  await page.goto("/shop/bag");
  await expect(page).toHaveURL(/\/shop\/bag$/);
});

test("a delayed stock refresh keeps a removed product out of the bag", async ({ page }) => {
  const slugs = ["pochampally-pattu-cadet-grey", "kota-cotton-forest-green"];
  const response = await page.request.get(`/api/shop/products?slugs=${slugs.join(",")}`);
  const { data } = await response.json();
  const items = slugs.map((slug) => ({ ...data.find((item: { slug: string }) => item.slug === slug), qty: 1 }));
  await page.addInitScript((lines) => localStorage.setItem("tb_bag_v2", JSON.stringify(lines)), items);

  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/shop/products?**", async (route) => {
    await wait;
    await route.fulfill({ json: { success: true, data: [items[0], { ...items[1], title: "Refreshed Kota saree" }] } });
  });
  await page.goto("/shop/bag");
  const removed = page.getByRole("listitem").filter({ hasText: items[0].title });
  await removed.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(removed).toHaveCount(0);
  release();
  await expect(page.getByText("Refreshed Kota saree", { exact: true })).toBeVisible();
  await expect(removed).toHaveCount(0);
});
