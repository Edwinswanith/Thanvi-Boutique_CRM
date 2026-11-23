import {
  ACTIONS,
  DATA_MODULES,
  SYSTEM_MODULES,
  permissionsFor,
  type Action,
  type DataModule,
  type Permission,
  type SystemModule,
} from "@/lib/rbac/permissions";
import type { LocationType } from "@/models/Location";

export interface RoleSeed {
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  confidential: boolean;
  allLocations: boolean;
  builtIn: true;
}

const allData = Object.keys(DATA_MODULES) as DataModule[];
const allSystem = Object.keys(SYSTEM_MODULES) as SystemModule[];
const RW: Action[] = ["view", "create", "edit"];

export const DEFAULT_ROLES: readonly RoleSeed[] = [
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Sets up stores, users, roles and numbering. Cannot see business data.",
    permissions: permissionsFor(allSystem, ACTIONS),
    isSystem: true,
    confidential: false,
    allLocations: true,
    builtIn: true,
  },
  {
    name: "Owner",
    slug: "owner",
    description: "Business owner. Full access to all data, costs, margins and metrics.",
    permissions: permissionsFor(allData, ACTIONS),
    isSystem: false,
    confidential: true,
    allLocations: true,
    builtIn: true,
  },
  {
    name: "Manager Head",
    slug: "manager-head",
    description: "Oversees all stores: stock, sales, staff and approvals.",
    permissions: [
      ...permissionsFor(["dashboard", "reports", "audit"], ["view", "export"]),
      ...permissionsFor(["taxes"], ["view"]),
      ...permissionsFor(["inventory", "transfers", "sales", "orders", "offers", "customers", "staff", "incentives"], [...RW, "approve", "export"]),
      ...permissionsFor(["vendors", "products"], ["view"]),
      ...permissionsFor(["catalog"], [...RW, "approve"]),
    ],
    isSystem: false,
    confidential: false,
    allLocations: true,
    builtIn: true,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Runs one store: inventory, stock requests, staff, attendance and incentives.",
    permissions: [
      ...permissionsFor(["dashboard", "reports"], ["view"]),
      ...permissionsFor(["inventory", "transfers", "sales", "orders", "customers", "staff", "incentives"], [...RW, "approve"]),
      ...permissionsFor(["products", "offers"], ["view"]),
    ],
    isSystem: false,
    confidential: false,
    allLocations: false,
    builtIn: true,
  },
  {
    name: "Salesperson",
    slug: "salesperson",
    description: "Bills customers at their store and looks up stock.",
    permissions: [
      ...permissionsFor(["sales", "orders", "customers"], ["view", "create"]),
      ...permissionsFor(["inventory", "products", "offers"], ["view"]),
    ],
    isSystem: false,
    confidential: false,
    allLocations: false,
    builtIn: true,
  },
  {
    name: "Godown Staff",
    slug: "godown-staff",
    description: "Receives vendor stock, prints labels, dispatches and receives transfers.",
    permissions: [
      ...permissionsFor(["inventory", "transfers", "products"], RW),
      ...permissionsFor(["vendors"], ["view", "create"]),
    ],
    isSystem: false,
    confidential: false,
    allLocations: false,
    builtIn: true,
  },
  {
    name: "Content Editor",
    slug: "content-editor",
    description: "Manages the website: product photos, copy, descriptions, SEO and publishing.",
    permissions: [
      ...permissionsFor(["catalog"], [...RW, "approve"]),
      ...permissionsFor(["products"], ["view"]),
    ],
    isSystem: false,
    confidential: false,
    allLocations: true,
    builtIn: true,
  },
  {
    name: "Vendor",
    slug: "vendor",
    description: "Vendor portal: own purchase orders and deliveries only.",
    permissions: permissionsFor(["vendors"], ["view"]),
    isSystem: false,
    confidential: false,
    allLocations: false,
    builtIn: true,
  },
];

export interface LocationSeed {
  code: string;
  name: string;
  type: LocationType;
}

export const DEFAULT_LOCATIONS: readonly LocationSeed[] = [
  { code: "GD1", name: "Godown 1", type: "godown" },
  { code: "GD2", name: "Godown 2", type: "godown" },
  { code: "SH1", name: "Shop 1", type: "store" },
  { code: "SH2", name: "Shop 2", type: "store" },
  { code: "SH3", name: "Shop 3", type: "store" },
  { code: "SH4", name: "Shop 4", type: "store" },
  { code: "WEB", name: "E-Commerce", type: "online" },
];

export const DEFAULT_SERIES = [
  { key: "sku", label: "Product SKU", prefix: "TB", next: 1000, padding: 4 },
  { key: "vendor", label: "Vendor ID", prefix: "XY", next: 1, padding: 1 },
  { key: "transfer", label: "Transfer reference", prefix: "TR-", next: 1, padding: 5 },
  { key: "order", label: "Online / Instagram order", prefix: "ORD-", next: 1, padding: 6 },
  { key: "receipt", label: "Goods receipt (GRN)", prefix: "GRN-", next: 1, padding: 5 },
] as const;
