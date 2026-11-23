import type { Permission } from "@/lib/rbac/permissions";

export interface NavItem {
  href: string;
  label: string;
  permission?: Permission;
  /** Shown greyed out with a phase tag until the module is built. */
  phase?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Home" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/inventory", label: "Inventory", permission: "inventory.view" },
      { href: "/admin/transfers", label: "Stock requests", permission: "transfers.view" },
      { href: "/admin/billing", label: "Billing (POS)", permission: "sales.create" },
      { href: "/admin/billing/invoices", label: "Invoices", permission: "sales.view" },
      { href: "/admin/orders", label: "Online & Instagram", permission: "orders.view", phase: "P3" },
      { href: "/admin/staff", label: "Staff & incentives", permission: "staff.view", phase: "P4" },
      { href: "/admin/reports", label: "Reports", permission: "reports.view", phase: "P4" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/admin/catalog", label: "Online catalog", permission: "catalog.view" },
      { href: "/admin/settings/gst", label: "GST & invoice", permission: "taxes.view" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/admin/settings/stores", label: "Stores & godowns", permission: "system.locations.view" },
      { href: "/admin/settings/roles", label: "Roles & permissions", permission: "system.roles.view" },
      { href: "/admin/settings/users", label: "Users", permission: "system.users.view" },
      { href: "/admin/settings/numbering", label: "SKU & numbering", permission: "system.numbering.view" },
    ],
  },
];

/** Most specific match wins, so /admin/billing/invoices doesn't also light up /admin/billing. */
export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  const matches = hrefs.filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(`${h}/`)));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}
