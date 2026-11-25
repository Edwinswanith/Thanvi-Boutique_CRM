import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

type User = keyof typeof E2E_USERS;

async function signIn(page: Page, role: User) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USERS[role].email);
  await page.getByLabel("Password").fill(E2E_USERS[role].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

const roles: { user: User; home: string; menu: string[]; allowed: string; denied: string }[] = [
  { user: "owner", home: "Business overview", menu: ["Home", "Inventory", "Sales", "Reports", "Settings"], allowed: "/admin/settings/users", denied: "" },
  { user: "superAdmin", home: "Configuration desk", menu: ["Home", "Settings"], allowed: "/admin/settings/stores", denied: "/admin/inventory" },
  { user: "head", home: "Operations overview", menu: ["Home", "Inventory", "Sales", "Reports"], allowed: "/admin/reports", denied: "/admin/settings/users" },
  { user: "manager", home: "Shop desk", menu: ["Home", "Inventory", "Sales", "Reports"], allowed: "/admin/transfers", denied: "/admin/orders" },
  { user: "salesperson", home: "Sales counter", menu: ["Home", "Inventory", "Sales"], allowed: "/admin/billing/invoices", denied: "/admin/reports" },
  { user: "godownReceiving", home: "Godown receiving", menu: ["Home", "Inventory"], allowed: "/admin/inventory/receive", denied: "/admin/inventory/vendors" },
  { user: "godownDistribution", home: "Godown distribution", menu: ["Home", "Inventory"], allowed: "/admin/transfers?queue=incoming", denied: "/admin/inventory/receive" },
  { user: "editor", home: "Website catalog", menu: ["Home", "Catalog"], allowed: "/admin/catalog", denied: "/admin/inventory/products" },
  { user: "vendor", home: "Vendor access", menu: ["Home"], allowed: "/admin", denied: "/admin/inventory/vendors" },
];

for (const role of roles) {
  test(role.user + " sees the right Home, navigation and access", async ({ page }) => {
    await signIn(page, role.user);
    await expect(page.getByRole("heading", { name: role.home, exact: true })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "CRM navigation" });
    await expect(navigation.getByRole("link")).toHaveText(role.menu);
    await page.goto(role.allowed);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (role.denied) {
      await page.goto(role.denied);
      await expect(page.getByText("Not available for your role")).toBeVisible();
    }
  });
}

async function receiveAtGodown(staff: Page, name: string, quantity: number) {
  await signIn(staff, "godownReceiving");
  await staff.getByRole("link", { name: "Receive vendor stock" }).click();
  await staff.getByLabel("Product name").fill(name);
  await staff.getByLabel("Category").fill("Silk saree");
  await staff.getByLabel("HSN code").fill("5007");
  await staff.getByLabel("Pieces received").fill(String(quantity));
  await staff.getByLabel("MRP per piece").fill("2500");
  await expect(staff.getByLabel("Purchase price")).toHaveCount(0);
  await staff.getByRole("button", { name: "Receive & generate codes" }).click();
  const pieces = staff.getByRole("list", { name: "Received codes" }).getByRole("listitem");
  await expect(pieces).toHaveCount(quantity);
  return pieces.allTextContents();
}

test("godown counts a piece and the owner approves the difference", async ({ browser, baseURL }) => {
  const staff = await browser.newPage({ baseURL });
  const owner = await browser.newPage({ baseURL });
  try {
    const [seen, missing] = await receiveAtGodown(staff, "Stock count QA saree", 2);
    await staff.getByRole("link", { name: "Stock counts", exact: true }).click();
    await staff.getByLabel("SKU (optional)").fill(seen.replace(/-001$/, ""));
    await staff.getByRole("button", { name: "Start count" }).click();
    await staff.getByRole("textbox", { name: "Add piece" }).fill(seen);
    await staff.getByRole("textbox", { name: "Add piece" }).press("Enter");
    await staff.getByRole("button", { name: "Save progress" }).click();
    await expect(staff.getByText("Count progress saved.")).toBeVisible();
    await staff.reload();
    await expect(staff.getByRole("list", { name: "Counted pieces" })).toContainText(seen);
    await staff.getByLabel("Reason for any differences").fill("Missing during the shelf count");
    await staff.getByRole("button", { name: "Submit count" }).click();
    await expect(staff.getByRole("region", { name: "Count differences" })).toContainText(missing);
    await expect(staff.getByRole("button", { name: "Approve adjustment" })).toHaveCount(0);

    await signIn(owner, "owner");
    const pending = owner.getByRole("region", { name: "Stock counts to review" }).getByRole("link", { name: /Godown 1/ });
    await pending.click();
    await owner.getByRole("button", { name: "Approve adjustment" }).click();
    await expect(owner.getByText("Approved by")).toBeVisible();
    const item = await owner.request.get("/api/items/" + missing);
    expect(item.ok()).toBe(true);
    expect((await item.json()).data.item.status).toBe("missing");
  } finally {
    await staff.close();
    await owner.close();
  }
});

async function scanPiece(page: Page, code: string) {
  const scan = page.getByRole("textbox", { name: "Add", exact: true });
  await scan.fill(code);
  await scan.press("Enter");
}

test("a vendor piece moves through both godowns, a shop request and salesperson billing", async ({ browser, baseURL }) => {
  const [godown, distribution, manager, owner, salesperson] = await Promise.all([
    browser.newPage({ baseURL }), browser.newPage({ baseURL }), browser.newPage({ baseURL }),
    browser.newPage({ baseURL }), browser.newPage({ baseURL }),
  ]);
  try {
    const [code] = await receiveAtGodown(godown, "Transfer QA saree", 1);
    await godown.getByRole("navigation", { name: "Inventory" }).getByRole("link", { name: "Transfers" }).click();
    await godown.getByLabel("Destination — applies to all pieces").selectOption({ label: "GD2 · Godown 2" });
    await godown.getByRole("button", { name: "Create & scan pieces" }).click();
    await scanPiece(godown, code);
    await godown.getByRole("button", { name: /Mark sent \(1\)/ }).click();
    await expect(godown.getByText("in transit", { exact: true })).toBeVisible();

    await signIn(distribution, "godownDistribution");
    await distribution.goto(godown.url());
    await scanPiece(distribution, code);
    await distribution.getByRole("button", { name: /Receive scanned \(1\)/ }).click();
    await expect(distribution.getByText("Pieces (1/1 received)")).toBeVisible();

    await signIn(manager, "manager");
    await manager.getByRole("link", { name: "Request stock", exact: true }).click();
    await manager.getByLabel("Request from (godown)").selectOption({ label: "GD2 · Godown 2" });
    await manager.getByRole("textbox", { name: "SKU", exact: true }).fill(code.replace(/-001$/, ""));
    await manager.getByRole("button", { name: "Send request" }).click();
    await expect(manager).toHaveURL(/\/admin\/transfers\/[a-f0-9]{24}$/);

    await signIn(owner, "owner");
    await owner.goto(manager.url());
    await owner.getByRole("button", { name: "Approve request" }).click();
    await expect(owner.getByText("Scan pieces to send")).toBeVisible();

    await distribution.goto(manager.url());
    await scanPiece(distribution, code);
    await distribution.getByRole("button", { name: /Mark sent \(1\)/ }).click();
    await expect(distribution.getByText("in transit", { exact: true })).toBeVisible();
    await expect(distribution.getByText("Scan pieces as they arrive")).toHaveCount(0);

    await manager.reload();
    await scanPiece(manager, code);
    await manager.getByRole("button", { name: /Receive scanned \(1\)/ }).click();
    await expect(manager.getByText("Pieces (1/1 received)")).toBeVisible();

    await signIn(salesperson, "salesperson");
    await salesperson.getByRole("link", { name: "New bill", exact: true }).click();
    await scanPiece(salesperson, code);
    await salesperson.getByRole("button", { name: "cash", exact: true }).click();
    await expect(salesperson.getByRole("button", { name: "Print invoice" })).toBeVisible();
    const item = await salesperson.request.get("/api/items/" + code);
    expect((await item.json()).data.item.status).toBe("sold");
  } finally {
    await Promise.all([godown.close(), distribution.close(), manager.close(), owner.close(), salesperson.close()]);
  }
});
