import { describe, expect, it } from "vitest";
import {
  hasPermission,
  isValidPermission,
  permissionsFor,
  sanitizePermissions,
  splitPermission,
  type RoleLike,
} from "@/lib/rbac/permissions";
import { DEFAULT_ROLES } from "@/server/seed/defaults";

const role = (overrides: Partial<RoleLike>): RoleLike => ({
  permissions: [],
  isSystem: false,
  confidential: false,
  allLocations: false,
  ...overrides,
});

describe("permission registry", () => {
  it("splits module and action, including dotted system modules", () => {
    expect(splitPermission("system.roles.edit")).toEqual({ module: "system.roles", action: "edit" });
    expect(splitPermission("inventory.view")).toEqual({ module: "inventory", action: "view" });
    expect(splitPermission("nodot")).toBeNull();
  });

  it("validates permissions against known modules and actions", () => {
    expect(isValidPermission("inventory.view")).toBe(true);
    expect(isValidPermission("inventory.fly")).toBe(false);
    expect(isValidPermission("unknown.view")).toBe(false);
  });

  it("builds module × action lists", () => {
    expect(permissionsFor(["sales"], ["view", "create"])).toEqual(["sales.view", "sales.create"]);
  });
});

describe("hasPermission", () => {
  it("grants only listed permissions", () => {
    const r = role({ permissions: ["sales.view"] });
    expect(hasPermission(r, "sales.view")).toBe(true);
    expect(hasPermission(r, "sales.create")).toBe(false);
    expect(hasPermission(null, "sales.view")).toBe(false);
  });

  it("keeps a system role data-blind even if a data permission is stored on it", () => {
    const superAdmin = role({ isSystem: true, permissions: ["system.users.view", "sales.view", "reports.view"] });
    expect(hasPermission(superAdmin, "system.users.view")).toBe(true);
    expect(hasPermission(superAdmin, "sales.view")).toBe(false);
    expect(hasPermission(superAdmin, "reports.view")).toBe(false);
  });

  it("never lets a data role use system permissions", () => {
    const owner = role({ permissions: ["system.roles.edit", "sales.view"] });
    expect(hasPermission(owner, "system.roles.edit")).toBe(false);
  });
});

describe("sanitizePermissions", () => {
  it("drops invalid, duplicate and wrong-side permissions", () => {
    const input = ["sales.view", "sales.view", "bogus", "system.roles.view", "inventory.fly"];
    expect(sanitizePermissions(input, false)).toEqual(["sales.view"]);
    expect(sanitizePermissions(input, true)).toEqual(["system.roles.view"]);
  });
});

describe("default roles", () => {
  it("gives the Super Admin no data permissions", () => {
    const sa = DEFAULT_ROLES.find((r) => r.slug === "super-admin")!;
    expect(sa.isSystem).toBe(true);
    expect(sa.permissions.every((p) => p.startsWith("system."))).toBe(true);
  });

  it("makes the Owner the only built-in role with confidential access", () => {
    const confidential = DEFAULT_ROLES.filter((r) => r.confidential).map((r) => r.slug);
    expect(confidential).toEqual(["owner"]);
  });

  it("only uses valid permissions", () => {
    for (const r of DEFAULT_ROLES) {
      expect(sanitizePermissions(r.permissions, r.isSystem)).toHaveLength(new Set(r.permissions).size);
    }
  });
});
