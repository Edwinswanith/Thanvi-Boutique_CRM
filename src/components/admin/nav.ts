import { hasPermission, isOwnerAdmin } from "@/lib/rbac/permissions";
import type { Actor } from "@/server/actor";
import type { LocationOption } from "@/server/services/myLocations";

export interface NavItem {
  href: string;
  label: string;
  matches?: string[];
}

export interface Workspace {
  label: string;
  tabs: NavItem[];
}

export function adminWorkspaces(actor: Actor, locations: readonly LocationOption[]): Workspace[] {
  const can = hasPermission.bind(null, actor.role);
  const atShop = locations.some((location) => location.type === "store");
  const atWeb = locations.some((location) => location.type === "online");
  const inventory: NavItem[] = [];
  const sales: NavItem[] = [];
  const settings: NavItem[] = [];
  if (can("inventory.view")) inventory.push({ href: "/admin/inventory", label: "Stock" });
  if (can("products.view") && can("inventory.view") && actor.role.slug !== "godown-staff" && (actor.role.allLocations || actor.role.slug === "manager-head")) {
    inventory.push({ href: "/admin/inventory/products", label: "Products" });
  }
  if (can("inventory.create") && !["manager", "manager-head"].includes(actor.role.slug ?? "") &&
    locations.some((location) => location.acceptsVendorStock || (isOwnerAdmin(actor.role) && location.type !== "online"))) {
    inventory.push({ href: "/admin/inventory/receive", label: "Receive" });
  }
  if (can("transfers.view")) inventory.push({ href: "/admin/transfers", label: "Transfers" });
  if (can("counts.view")) inventory.push({ href: "/admin/inventory/counts", label: "Stock counts" });
  if (can("vendors.view") || can("payables.view")) {
    inventory.push({
      href: can("vendors.view") ? "/admin/inventory/vendors" : "/admin/payables",
      label: "Vendors",
      matches: ["/admin/inventory/vendors", "/admin/payables"],
    });
  }
  if (can("sales.create") && (atShop || atWeb)) sales.push({ href: "/admin/billing", label: "Billing" });
  if (can("sales.view")) sales.push({ href: "/admin/billing/invoices", label: actor.role.slug === "salesperson" ? "My invoices" : "Invoices" });
  if (can("orders.view") && atWeb) sales.push({ href: "/admin/orders", label: "Orders" });
  const catalog = can("catalog.view") ? { href: "/admin/catalog", label: "Catalog" } : null;
  if (catalog && sales.length) sales.push(catalog);

  if (can("system.locations.view")) settings.push({ href: "/admin/settings/stores", label: "Locations" });
  if (can("system.users.view") || can("system.roles.view")) {
    settings.push({
      href: can("system.users.view") ? "/admin/settings/users" : "/admin/settings/roles",
      label: "Users & permissions",
      matches: ["/admin/settings/users", "/admin/settings/roles"],
    });
  }
  if (can("system.numbering.view")) settings.push({ href: "/admin/settings/numbering", label: "Numbering" });
  if (can("taxes.view")) settings.push({ href: "/admin/settings/gst", label: "GST & invoice" });

  const workspaces = [
    { label: "Home", tabs: [{ href: "/admin", label: "Home" }] },
    { label: "Inventory", tabs: inventory },
    { label: "Sales", tabs: sales },
    { label: "Catalog", tabs: catalog && !sales.includes(catalog) ? [catalog] : [] },
    { label: "Reports", tabs: can("reports.view") ? [{ href: "/admin/reports", label: "Reports" }] : [] },
    { label: "Settings", tabs: settings },
  ];
  return workspaces.filter((workspace) => workspace.tabs.length > 0);
}

/** Most specific match wins, so /admin/billing/invoices doesn't also light up /admin/billing. */
export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  const matches = hrefs.filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(`${h}/`)));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function activeItem(pathname: string, items: readonly NavItem[]): NavItem | undefined {
  const route = activeHref(pathname, items.flatMap((item) => [item.href, ...(item.matches ?? [])]));
  return items.find((item) => item.href === route || item.matches?.includes(route ?? ""));
}
