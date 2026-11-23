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
