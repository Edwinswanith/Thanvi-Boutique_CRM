import { expect, test } from "@playwright/test";
import { E2E_USERS } from "./users";

test("owner sees vendor dues and records a part payment against a bill", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(E2E_USERS.owner.email);
  await page.getByLabel("Password").fill(E2E_USERS.owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
  await expect(page.getByTestId("vendor-pending")).toContainText("₹");

  await page.getByRole("link", { name: "Vendor dues" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Vendor dues" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kanchipuram Silk Weavers (demo)" })).toBeVisible();

  await page.getByRole("link", { name: "Overdue", exact: true }).click();
  await expect(page).toHaveURL(/status=overdue/);
  const row = page.getByRole("row").filter({ hasText: "DEMO-VB-007" });
  await expect(row).toContainText("Overdue");
  await row.getByRole("button", { name: "Pay" }).click();

  const dialog = page.getByRole("dialog", { name: "Bill DEMO-VB-007" });
  await expect(dialog.getByText("No payments yet.")).toBeVisible();
  await dialog.getByLabel("Amount paid (₹)").fill("99999");
  await dialog.getByLabel("Reference (UTR / cheque no.)").fill("E2E-UTR-1");
  await dialog.getByLabel("Amount paid (₹)").fill("4600");
  await dialog.getByRole("button", { name: "Record payment" }).click();
  await expect(dialog.getByText("Payment recorded.")).toBeVisible();
  await expect(dialog.getByText("E2E-UTR-1")).toBeVisible();
  await expect(dialog.getByText("₹20,000.00")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(row).toContainText("₹20,000.00");
});

test("vendor dues need a sign-in", async ({ page, request }) => {
  expect((await request.get("/api/payables/bills")).status()).toBe(401);
  await page.goto("/admin/payables");
  await expect(page).toHaveURL(/\/login/);
});
