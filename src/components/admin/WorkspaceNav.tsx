"use client";

import { usePathname } from "next/navigation";
import { activeItem, type Workspace } from "./nav";
import { SubNav } from "./ui";

export function WorkspaceNav({ workspaces }: { workspaces: Workspace[] }) {
  const pathname = usePathname();
  const allTabs = workspaces.flatMap((workspace) => workspace.tabs);
  const active = activeItem(pathname, allTabs);
  const workspace = active && workspaces.find((group) => group.tabs.includes(active));
  if (!workspace || workspace.tabs.length < 2 ||
    pathname === "/admin/inventory/labels" ||
    pathname.startsWith("/admin/billing/invoices/") ||
    pathname.startsWith("/admin/orders/")) return null;
  return <SubNav tabs={workspace.tabs} label={workspace.label} />;
}
