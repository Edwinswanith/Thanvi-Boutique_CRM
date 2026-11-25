import { describe, expect, it } from "vitest";
import { AuditLog } from "@/models/AuditLog";
import { NumberSeries } from "@/models/NumberSeries";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { can, canAccessLocation } from "@/server/actor";
import { createLocation, listLocations, updateLocation } from "@/server/services/locations";
import { listSeries, nextCode, updateSeries } from "@/server/services/numberSeries";
import { createRole, deleteRole, listRoles, updateRole } from "@/server/services/roles";
import { createUser, deactivateUser, listUsers, updateUser } from "@/server/services/users";
import { runSeed } from "@/server/seed/run";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

describe("seed", () => {
  it("creates defaults and is idempotent", async () => {
    await runSeed([]);
    expect(await Role.countDocuments()).toBe(8);
    expect((await listLocations()).map((l) => l.code)).toEqual(["GD1", "GD2", "WEB", "SH1", "SH2", "SH3", "SH4"]);
    expect(await NumberSeries.exists({ key: "invoice:SH1" })).toBeTruthy();
    expect(await NumberSeries.exists({ key: "invoice:GD1" })).toBeFalsy();
  });

  it("creates seed accounts once", async () => {
    const acc = { email: "SA@x.com", password: "longpassword1", name: "SA", roleSlug: "super-admin" };
    expect((await runSeed([acc])).users).toEqual(["SA@x.com"]);
    expect((await runSeed([acc])).users).toEqual([]);
  });
});

describe("number series", () => {
  it("issues unique sequential codes under concurrency", async () => {
    const codes = await Promise.all(Array.from({ length: 25 }, () => nextCode("sku")));
    expect(new Set(codes).size).toBe(25);
    expect(codes.sort()[0]).toBe("TB1000");
    expect(codes.sort()[24]).toBe("TB1024");
  });

  it("lets the admin set prefix and starting number", async () => {
    const sa = await actorWithRole("super-admin");
    const view = await updateSeries(sa, "sku", { prefix: "thv", next: 5000, padding: 5 });
    expect(view.preview).toBe("THV05000");
    expect(await nextCode("sku")).toBe("THV05000");
    expect((await listSeries()).find((s) => s.key === "sku")?.next).toBe(5001);
    expect(await AuditLog.countDocuments({ action: "numberSeries.update" })).toBe(1);
  });

  it("rejects non-barcode prefixes and unknown series", async () => {
    const sa = await actorWithRole("super-admin");
    await expect(updateSeries(sa, "sku", { prefix: "TB_", next: 1, padding: 4 })).rejects.toThrow();
    await expect(updateSeries(sa, "nope", { prefix: "A", next: 1, padding: 4 })).rejects.toThrow("not found");
    await expect(nextCode("nope")).rejects.toThrow("not configured");
  });
});

describe("locations (store wizard)", () => {
  it("creates a store with its own invoice series, atomically", async () => {
    const sa = await actorWithRole("super-admin");
    const shop5 = await createLocation(sa, { code: "sh5", name: "Shop 5 — T Nagar", type: "store", city: "Chennai" });
    expect(shop5.code).toBe("SH5");
    expect(shop5.invoicePrefix).toBe("SH5-");
    expect(await nextCode("invoice:SH5")).toBe("SH5-00001");
    expect(await AuditLog.countDocuments({ action: "location.create" })).toBe(1);
  });

  it("rejects duplicate codes and code changes", async () => {
    const sa = await actorWithRole("super-admin");
    await expect(createLocation(sa, { code: "SH1", name: "Dup", type: "store" })).rejects.toThrow();
    const [gd1] = await listLocations();
    await expect(updateLocation(sa, gd1.id, { code: "X1" })).rejects.toThrow("cannot be changed");
    const updated = await updateLocation(sa, gd1.id, { active: false });
    expect(updated.active).toBe(false);
  });
});

describe("roles", () => {
  it("creates custom data roles and strips system permissions", async () => {
    const sa = await actorWithRole("super-admin");
    const role = await createRole(sa, { name: "Cashier", permissions: ["sales.view", "sales.create", "system.roles.edit", "junk"] });
    expect(role.permissions).toEqual(["sales.view", "sales.create"]);
    expect(role.isSystem).toBe(false);
    const updated = await updateRole(sa, role.id, { name: "Senior Cashier", permissions: ["sales.view"] });
    expect(updated.slug).toBe("senior-cashier");
  });

  it("locks the Super Admin role and built-in roles", async () => {
    const sa = await actorWithRole("super-admin");
    const roles = await listRoles();
    const saRole = roles.find((r) => r.slug === "super-admin")!;
    const owner = roles.find((r) => r.slug === "owner")!;
    await expect(updateRole(sa, saRole.id, { permissions: ["sales.view"] })).rejects.toThrow("locked");
    await expect(deleteRole(sa, owner.id)).rejects.toThrow("Built-in");
  });

  it("refuses to delete a role that is in use", async () => {
    const sa = await actorWithRole("super-admin");
    const role = await createRole(sa, { name: "Temp" });
    await User.create({ name: "U", email: "u@x.com", passwordHash: "x", roleId: role.id });
    await expect(deleteRole(sa, role.id)).rejects.toThrow("assigned");
    await User.deleteMany({});
    await deleteRole(sa, role.id);
    expect((await listRoles()).some((r) => r.id === role.id)).toBe(false);
  });
});

describe("users", () => {
  it("creates users with hashed passwords and location access", async () => {
    const sa = await actorWithRole("super-admin");
    const roles = await listRoles();
    const manager = roles.find((r) => r.slug === "manager")!;
    const [, , , sh1] = await listLocations();
    const user = await createUser(sa, {
      name: "Priya", email: "Priya@Thanvi.in", password: "storepass123", roleId: manager.id, locationIds: [sh1.id],
    });
    expect(user.email).toBe("priya@thanvi.in");
    expect(user.roleName).toBe("Shop Manager");
    const raw = await User.findById(user.id).select("+passwordHash").lean();
    expect(raw!.passwordHash).not.toContain("storepass123");
    const audit = await AuditLog.findOne({ action: "user.create" }).lean();
    expect(JSON.stringify(audit)).not.toContain("passwordHash");
    expect((await listUsers()).length).toBe(1);
  });

  it("validates role, locations and password strength", async () => {
    const sa = await actorWithRole("super-admin");
    const roleId = (await listRoles())[0].id;
    await expect(createUser(sa, { name: "A", email: "a@x.com", password: "short", roleId })).rejects.toThrow();
    await expect(
      createUser(sa, { name: "Ab", email: "a@x.com", password: "longpassword1", roleId: "0".repeat(24) }),
    ).rejects.toThrow("role");
    await expect(
      createUser(sa, { name: "Ab", email: "a@x.com", password: "longpassword1", roleId, locationIds: ["0".repeat(24)] }),
    ).rejects.toThrow("locations");
  });

  it("stops users changing their own role or deactivating themselves", async () => {
    const sa = await actorWithRole("super-admin");
    const admin = await actorWithRole("owner");
    const roles = await listRoles();
    const created = await createUser(admin, {
      name: "Root", email: "root@x.com", password: "longpassword1", roleId: roles.find((r) => r.slug === "super-admin")!.id,
    });
    const self = { ...sa, id: created.id };
    const owner = roles.find((r) => r.slug === "owner")!;
    await expect(updateUser(self, created.id, { roleId: owner.id })).rejects.toThrow("own role");
    await expect(deactivateUser(self, created.id)).rejects.toThrow("own account");
    await expect(deactivateUser(sa, created.id)).rejects.toThrow("Owner / Admin");
    const other = await deactivateUser(admin, created.id);
    expect(other.active).toBe(false);
    await expect(updateUser(sa, "bad-id", { name: "Xy" })).rejects.toThrow("not found");
  });

  it("keeps protected roles and credentials under Owner / Admin", async () => {
    const setup = await actorWithRole("super-admin");
    const admin = await actorWithRole("owner");
    const protectedUser = {
      name: "Business administrator", email: "business@thanvi.test", password: "longpassword1", roleId: admin.role.id,
    };
    await expect(createUser(setup, protectedUser)).rejects.toThrow("Owner / Admin");
    const user = await createUser(admin, protectedUser);
    await expect(updateUser(setup, user.id, { password: "anotherpassword1" })).rejects.toThrow("Owner / Admin");
    await expect(createRole(setup, { name: "Costs", confidential: true })).rejects.toThrow("confidential access");
    expect((await createRole(admin, { name: "Costs", confidential: true })).confidential).toBe(true);
  });
});

describe("actor helpers", () => {
  it("scopes by permission and location", async () => {
    const manager = await actorWithRole("manager", { locationIds: ["loc1"] });
    const owner = await actorWithRole("owner");
    const sa = await actorWithRole("super-admin");
    expect(can(manager, "staff.create")).toBe(true);
    expect(can(manager, "system.users.view")).toBe(false);
    expect(can(sa, "reports.view")).toBe(false);
    expect(can(sa, "system.locations.create")).toBe(true);
    expect(canAccessLocation(manager, "loc1")).toBe(true);
    expect(canAccessLocation(manager, "loc2")).toBe(false);
    expect(canAccessLocation(owner, "anything")).toBe(true);
  });
});
