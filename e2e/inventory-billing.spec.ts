import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

async function signInOwner(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USERS.owner.email);
  await page.getByLabel("Password").fill(E2E_USERS.owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
}

async function scan(page: Page, code: string, label = "Find") {
  await page.getByRole("textbox", { name: label, exact: true }).fill(code);
  await page.getByRole("textbox", { name: label, exact: true }).press("Enter");
}

test("receive → shelve → scan → transfer → bill → sold", async ({ page }) => {
  test.setTimeout(120_000);
  await signInOwner(page);

  // 1. Map Godown 1 into racks & shelves
  await page.goto("/admin/inventory/storage");
  await page.getByLabel("Racks").fill("2");
  await page.getByLabel("Shelves each").fill("2");
  await page.getByRole("button", { name: "Create grid" }).click();
  await expect(page.getByText(/new bin\(s\) created/)).toBeVisible();
  await expect(page.getByText("R1-S1")).toBeVisible();

  // 2. Vendor
  await page.goto("/admin/inventory/vendors");
  await page.getByRole("button", { name: "+ Add vendor" }).click();
  await page.getByLabel("Vendor name").fill("Kanchi Weavers");
  await page.getByRole("button", { name: "Add vendor", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Kanchi Weavers" })).toBeVisible();

  // 3. Receive 2 pieces into GD1 / R1-S1
  await page.goto("/admin/inventory/receive");
  await page.getByLabel("Product name").fill("Kanchipuram silk saree");
  await page.getByLabel("Category").fill("Silk saree");
  await page.getByLabel("HSN code").fill("5007");
  await page.getByLabel("Pieces received").fill("2");
  await page.getByLabel("MRP per piece (₹)").fill("10500");
  await expect(page.getByLabel("Put away into bin").locator("option", { hasText: "R1-S1" })).toHaveCount(1);
  await page.getByLabel("Put away into bin").selectOption({ label: "R1-S1" });
  await page.getByRole("button", { name: "Receive & generate codes" }).click();
  const codeItem = page.getByRole("list", { name: "Received codes" }).getByRole("listitem").first();
  await expect(codeItem).toHaveText(/-001$/);
  const code = (await codeItem.textContent())!.trim();

  // 4. Scan: where is it?
  await page.goto("/admin/inventory");
  await scan(page, code);
  await expect(page.getByText("Godown 1")).toBeVisible();
  await expect(page.getByText("R1-S1", { exact: true })).toBeVisible();

  // 5. Direct transfer GD1 → SH1, dispatch and receive by scanning
  await page.goto("/admin/transfers");
  await page.getByRole("tab", { name: "Send stock directly" }).click();
  await page.getByLabel("Send from").selectOption({ label: "GD1 · Godown 1" });
  await page.getByLabel("Destination — applies to all pieces").selectOption({ label: "SH1 · Shop 1" });
  await page.getByRole("button", { name: "Create & scan pieces" }).click();
  await expect(page).toHaveURL(/\/admin\/transfers\/[a-f0-9]{24}/);
  await scan(page, code, "Add");
  await page.getByRole("button", { name: /Mark sent \(1\)/ }).click();
  await expect(page.getByText("Scan pieces as they arrive")).toBeVisible();
  await scan(page, code, "Add");
  await page.getByRole("button", { name: /Receive scanned \(1\)/ }).click();
  await expect(page.getByText("Pieces (1/1 received)")).toBeVisible();

  // 6. Bill it at Shop 1 for cash
  await page.goto("/admin/billing");
  await expect(page.getByLabel("Store")).toHaveValue(/.+/);
  await page.getByLabel("Store").selectOption({ label: "SH1 · Shop 1" });
  await scan(page, code, "Add");
  await expect(page.getByRole("cell", { name: "₹10,500.00" }).last()).toBeVisible();
  await page.getByRole("button", { name: "cash", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/billing\/invoices\/[a-f0-9]{24}/);
  await expect(page.getByText("TAX INVOICE")).toBeVisible();
  await expect(page.getByText("No. SH1-00001")).toBeVisible();
  await expect(page.getByText("Rupees Ten Thousand Five Hundred Only")).toBeVisible();

  // 7. The piece is now sold and can't be billed again
  await page.goto("/admin/inventory");
  await scan(page, code);
  await expect(page.getByText("sold", { exact: true })).toBeVisible();
});
