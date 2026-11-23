import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { sanitizePermissions } from "@/lib/rbac/permissions";
import { roleCreateSchema, roleUpdateSchema } from "@/lib/validation/schemas";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";

export interface RoleView {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  confidential: boolean;
  allLocations: boolean;
  builtIn: boolean;
  userCount: number;
}

interface RoleLean {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  confidential: boolean;
  allLocations: boolean;
  builtIn: boolean;
}

function toView(doc: RoleLean, userCount = 0): RoleView {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    permissions: [...doc.permissions],
    isSystem: doc.isSystem,
    confidential: doc.confidential,
    allLocations: doc.allLocations,
    builtIn: doc.builtIn,
    userCount,
  };
}

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function listRoles(): Promise<RoleView[]> {
  const [docs, counts] = await Promise.all([
    Role.find().sort({ isSystem: -1, name: 1 }).lean<RoleLean[]>(),
    User.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: "$roleId", n: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => toView(d, countMap.get(String(d._id)) ?? 0));
}

/** Roles created from the UI are always data roles; system roles only come from seeding. */
export async function createRole(actor: Actor, input: unknown): Promise<RoleView> {
  const data = roleCreateSchema.parse(input);
  const doc = await Role.create({
    ...data,
    slug: slugify(data.name),
    permissions: sanitizePermissions(data.permissions, false),
    isSystem: false,
    builtIn: false,
  });
  const view = toView(doc.toObject() as RoleLean);
  await writeAudit(actor, { action: "role.create", entity: "role", entityId: view.id, after: view });
  return view;
}

export async function updateRole(actor: Actor, id: string, input: unknown): Promise<RoleView> {
  const data = roleUpdateSchema.parse(input);
  const before = await Role.findById(id).lean<RoleLean>();
  if (!before) throw new AppError("Role not found", 404);
  if (before.isSystem) throw new AppError("The Super Admin role is locked to protect system access", 403);
  if (id === actor.role.id) throw new AppError("You cannot change your own role", 403);

  const patch = {
    ...data,
    ...(data.name ? { slug: slugify(data.name) } : {}),
    ...(data.permissions ? { permissions: sanitizePermissions(data.permissions, false) } : {}),
  };
  const updated = await Role.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after" }).lean<RoleLean>();
  await writeAudit(actor, { action: "role.update", entity: "role", entityId: id, before, after: updated });
  return toView(updated!);
}

export async function deleteRole(actor: Actor, id: string): Promise<void> {
  const role = await Role.findById(id).lean<RoleLean>();
  if (!role) throw new AppError("Role not found", 404);
  if (role.builtIn || role.isSystem) throw new AppError("Built-in roles cannot be deleted", 403);
  const inUse = await User.countDocuments({ roleId: role._id });
  if (inUse > 0) throw new AppError(`Role is assigned to ${inUse} user(s). Reassign them first.`, 409);
  await Role.deleteOne({ _id: role._id });
  await writeAudit(actor, { action: "role.delete", entity: "role", entityId: id, before: role });
}
