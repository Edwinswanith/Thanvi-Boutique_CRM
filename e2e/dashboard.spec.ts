import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

async function signIn(page: Page, who: keyof typeof E2E_USERS) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(E2E_USERS[who].email);
  await page.getByLabel("Password").fill(E2E_USERS[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
}

test("owner sees sales, store ranking and next week's forecast, and can filter", async ({ page }) => {
  await signIn(page, "owner");
  await expect(page.getByText("Business overview")).toBeVisible();
  await expect(page.getByTestId("kpi-revenue")).toContainText("₹");
  await expect(page.getByTestId("forecast-total")).toContainText("₹");
  await expect(page.getByRole("heading", { name: "Which store is doing best" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top salespeople" })).toBeVisible();
  await expect(page.getByText("Gross margin")).toBeVisible();
  await expect(page.getByText("Sample data.")).toBeVisible();

  const thirty = await page.getByTestId("kpi-revenue").textContent();
  await page.getByRole("group", { name: "Period" }).getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByTestId("kpi-revenue")).not.toHaveText(thirty!);

  await page.getByLabel("Store").selectOption({ label: "Shop 2" });
  await expect(page).toHaveURL(/store=/);
  await expect(page.getByText("Shop 2. Sales, best performers")).toBeVisible();
});

test("super admin gets the setup desk and no business figures", async ({ page }) => {
  await signIn(page, "superAdmin");
  await expect(page.getByRole("heading", { name: "Configuration desk" })).toBeVisible();
  await expect(page.getByTestId("kpi-revenue")).toHaveCount(0);
  expect((await page.request.get("/api/analytics/overview")).status()).toBe(403);
});
