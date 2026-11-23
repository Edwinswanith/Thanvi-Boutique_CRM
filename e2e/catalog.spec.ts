import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

async function signIn(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(E2E_USERS.owner.email);
  await page.getByLabel("Password").fill(E2E_USERS.owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
}

test("content editor updates copy live, unpublishes and republishes a saree", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Online catalog" }).first().click();
  await expect(page.getByRole("heading", { name: "Online catalog" })).toBeVisible();
  await page.getByRole("link", { name: /Raga Silk Saree/ }).first().click();
  await expect(page.getByText("Live on website")).toBeVisible();

  const tagline = "Featherlight raga silk, tested end to end.";
  await page.getByLabel("Short description").fill(tagline);
  await expect(page.getByText("You have unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Changes are live on the website.")).toBeVisible();

  const shop = await page.context().newPage();
  await shop.goto("/shop/sarees/raga-silk-warm-blue");
  await expect(shop.getByText(tagline, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished. It's hidden from the website.")).toBeVisible();
  expect((await shop.goto("/shop/sarees/raga-silk-warm-blue"))?.status()).toBe(404);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published. It's now live on the website.")).toBeVisible();
  expect((await shop.goto("/shop/sarees/raga-silk-warm-blue"))?.status()).toBe(200);
});

test("publishing is blocked until the checklist is complete", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/catalog?status=published");
  await page.getByRole("link", { name: /Kota Cotton Saree/ }).first().click();
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
  await page.getByLabel("Full description").fill("Too short");
  await expect(page.getByRole("button", { name: "Save & publish" })).toBeDisabled();
  await expect(page.getByText("Finish the items marked ! to publish.")).toBeVisible();
});
