import { expect, test } from "@playwright/test";
import { E2E_USERS } from "./users";

test("a staff cancellation returns a COD order's piece to the shop", async ({ page }) => {
  const slug = "pochampally-pattu-cadet-grey";
  async function available() {
    const response = await page.request.get(`/api/shop/products?slugs=${slug}`);
    return (await response.json()).data[0].availableQuantity;
  }
  const before = await available();
  await page.goto(`/shop/sarees/${slug}`);
  await page.getByRole("button", { name: "BUY NOW", exact: true }).click();
  await page.getByRole("link", { name: "Checkout", exact: true }).click();
  for (const [label, value] of Object.entries({
    "Full name": "Cancellation QA", Email: "qa@example.test", Phone: "9000000000", "Street address": "1 Test Street",
    City: "Chennai", "PIN code": "600001",
  })) await page.getByLabel(label).fill(value);
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Tamil Nadu");
  await page.getByRole("radio", { name: "Cash on delivery" }).check();
  await page.getByRole("button", { name: "Review shipping and GST" }).click();
  await expect(page.getByText("Shipping before GST", { exact: true })).toBeVisible();
  await expect(page.getByText("CGST", { exact: true })).toBeVisible();
  expect(await available()).toBe(before);
  await page.getByRole("button", { name: "Place test order" }).click();
  await expect(page.getByRole("heading", { name: "Test order confirmed" })).toBeVisible();
  expect(await available()).toBe(before - 1);
  const invoice = page.getByRole("link", { name: "View test invoice" });
  const invoiceUrl = (await invoice.getAttribute("href"))!;
  expect((await page.request.get(invoiceUrl.split("?")[0])).status()).toBe(404);
  await invoice.click();
  await expect(page.getByRole("heading", { name: "Test invoice", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print test invoice" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USERS.owner.email);
  await page.getByLabel("Password").fill(E2E_USERS.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Website orders", exact: true })).toBeVisible();
  await expect(page.getByText("Test COD pending", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Online orders", exact: true }).click();
  const order = page.getByRole("row").filter({ hasText: "Cancellation QA" });
  await expect(order.getByRole("link", { name: "Test invoice", exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await order.getByRole("button", { name: "Cancel order", exact: true }).click();
  await expect(order.getByText("cancelled", { exact: true })).toBeVisible();
  await expect(order.getByRole("button", { name: "Cancel order", exact: true })).toHaveCount(0);
  expect(await available()).toBe(before);
});
