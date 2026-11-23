import type { Tab } from "@/components/admin/ui";

export const INVENTORY_TABS: Tab[] = [
  { href: "/admin/inventory", label: "Stock & scan" },
  { href: "/admin/inventory/receive", label: "Receive stock" },
  { href: "/admin/inventory/products", label: "Products" },
  { href: "/admin/inventory/storage", label: "Storage bins" },
  { href: "/admin/inventory/vendors", label: "Vendors" },
];
