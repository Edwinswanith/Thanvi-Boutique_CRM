export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;
export type Action = (typeof ACTIONS)[number];

/** Configuration modules for Owner / Admin and delegated Setup Admin. */
export const SYSTEM_MODULES = {
  "system.roles": "Roles & permissions",
  "system.users": "Users",
  "system.locations": "Stores & godowns",
  "system.numbering": "SKU & numbering",
} as const;

/** Business modules. Setup-only roles cannot use these. */
export const DATA_MODULES = {
  dashboard: "Dashboard & metrics",
  vendors: "Vendors",
  payables: "Vendor bills & payments",
  products: "Products & SKUs",
  inventory: "Inventory",
  counts: "Stock counts & adjustments",
  transfers: "Stock requests & transfers",
  sales: "Billing & invoices",
  orders: "Online & Instagram orders",
  offers: "Offers",
  customers: "Customers",
  reports: "Reports",
  staff: "Staff & attendance",
  incentives: "Incentives",
  audit: "Audit log",
  taxes: "GST & invoice settings",
  catalog: "Website catalog (photos, copy, SEO, publishing)",
} as const;

export type SystemModule = keyof typeof SYSTEM_MODULES;
export type DataModule = keyof typeof DATA_MODULES;
export type Module = SystemModule | DataModule;
export type Permission = `${Module}.${Action}`;

export const ALL_MODULES: Module[] = [
  ...(Object.keys(SYSTEM_MODULES) as SystemModule[]),
  ...(Object.keys(DATA_MODULES) as DataModule[]),
];

export const MODULE_LABELS: Record<Module, string> = { ...SYSTEM_MODULES, ...DATA_MODULES };

export function isSystemModule(module: string): module is SystemModule {
  return module in SYSTEM_MODULES;
}

export function splitPermission(permission: string): { module: string; action: string } | null {
  const idx = permission.lastIndexOf(".");
  if (idx <= 0) return null;
  return { module: permission.slice(0, idx), action: permission.slice(idx + 1) };
}

export function isValidPermission(permission: string): permission is Permission {
  const parts = splitPermission(permission);
  if (!parts) return false;
  return (ALL_MODULES as string[]).includes(parts.module) && (ACTIONS as readonly string[]).includes(parts.action);
}

export function permissionsFor(modules: readonly Module[], actions: readonly Action[] = ACTIONS): Permission[] {
  return modules.flatMap((m) => actions.map((a) => `${m}.${a}` as Permission));
}

export interface RoleLike {
  readonly slug?: string;
  readonly builtIn?: boolean;
  readonly permissions: readonly string[];
  readonly isSystem: boolean;
  readonly confidential: boolean;
  readonly allLocations: boolean;
}

export function isOwnerAdmin(role: Pick<RoleLike, "slug" | "builtIn">): boolean {
  return role.slug === "owner" && role.builtIn === true;
}

export function hasPermission(role: RoleLike | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const parts = splitPermission(permission);
  if (!parts) return false;
  if (role.slug === "vendor") return false;
  if (role.isSystem && !isSystemModule(parts.module)) return false;
  if (!role.isSystem && isSystemModule(parts.module) && !isOwnerAdmin(role)) return false;
  if (parts.module === "payables" && !role.confidential) return false;
  return role.permissions.includes(permission);
}

/** Removes permissions a role is not allowed to hold (invalid, or wrong side of the system/data split). */
export function sanitizePermissions(permissions: readonly string[], isSystem: boolean): Permission[] {
  const unique = Array.from(new Set(permissions));
  return unique.filter((p): p is Permission => {
    if (!isValidPermission(p)) return false;
    const { module } = splitPermission(p)!;
    return isSystem ? isSystemModule(module) : !isSystemModule(module);
  });
}
