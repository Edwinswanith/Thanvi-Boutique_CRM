import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

async function signIn(page: Page, who: keyof typeof E2E_USERS) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(E2E_USERS[who].email);
  await page.getByLabel("Password").fill(E2E_USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
}

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USERS.owner.email);
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 30_000 });
});

test("Super Admin opens a new store with its own invoice series", async ({ page }) => {
  await signIn(page, "superAdmin");
  await page.getByRole("link", { name: "Stores & godowns" }).first().click();
  await page.getByRole("button", { name: "+ New location" }).click();
  await page.getByLabel("Name").fill("Shop 5 Anna Nagar");
  await expect(page.getByLabel("Short code")).toHaveValue("S5AN");
  await page.getByLabel("Short code").fill("SH5");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("City").fill("Chennai");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("SH5-00001")).toBeVisible();
  await page.getByRole("button", { name: "Create location" }).click();
  await expect(page.getByRole("heading", { name: "Shop 5 Anna Nagar" }).or(page.getByText("Shop 5 Anna Nagar"))).toBeVisible();

  await page.getByRole("link", { name: "SKU & numbering" }).click();
  await expect(page.getByText("Invoices — SH5")).toBeVisible();
});

test("Super Admin sets the SKU prefix and start number", async ({ page }) => {
  await signIn(page, "superAdmin");
  await page.goto("/admin/settings/numbering");
  await page.locator("#sku-prefix").fill("THV");
  await page.locator("#sku-next").fill("5000");
  await expect(page.getByText("THV5000-001")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.locator("#sku-prefix")).toHaveValue("THV");
  await expect(page.getByRole("img", { name: "Barcode THV5000-001" })).toBeVisible();
});

test("Super Admin cannot reach business data; Owner cannot reach setup", async ({ page }) => {
  await signIn(page, "superAdmin");
  await expect(page.getByRole("link", { name: "Billing", exact: true })).toHaveCount(0);
  const asSuper = await page.request.get("/api/me");
  expect((await asSuper.json()).data.role.isSystem).toBe(true);

  await page.context().clearCookies();
  await signIn(page, "owner");
  await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
  const res = await page.request.get("/api/users");
  expect(res.status()).toBe(403);
  await page.goto("/admin/settings/roles");
  await expect(page.getByText("Not available for your role")).toBeVisible();
});

test("Super Admin creates a manager for one store", async ({ page }) => {
  await signIn(page, "superAdmin");
  await page.goto("/admin/settings/users");
  await page.getByRole("button", { name: "+ Add user" }).click();
  await page.getByLabel("Full name").fill("Lakshmi Manager");
  await page.getByLabel("Email (login)").fill("lakshmi@thanvi.test");
  await page.getByLabel("Temporary password").fill("store-manager-9");
  await page.getByLabel("Role").selectOption({ label: "Manager" });
  await page.getByRole("button", { name: /SH1/ }).click();
  await page.getByRole("button", { name: "Create user" }).click();
  const row = page.getByRole("row", { name: /Lakshmi Manager/ });
  await expect(row).toContainText("Manager");
  await expect(row).toContainText("SH1");
});
