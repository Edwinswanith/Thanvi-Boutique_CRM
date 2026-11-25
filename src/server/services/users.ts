import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation/schemas";
import { Location } from "@/models/Location";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import type { Actor } from "@/server/actor";
import { hashPassword } from "@/server/auth/password";
import { writeAudit } from "./audit";

export interface UserView {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  roleName: string;
  locationIds: string[];
  active: boolean;
  lastLoginAt: string | null;
}

interface UserLean {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  roleId: Types.ObjectId | { _id: Types.ObjectId; name: string };
  locationIds: Types.ObjectId[];
  active: boolean;
  lastLoginAt?: Date | null;
}

function toView(doc: UserLean): UserView {
  const role = doc.roleId as { _id?: Types.ObjectId; name?: string };
  const populated = role && typeof role === "object" && "name" in role;
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    phone: doc.phone ?? "",
    roleId: populated ? String(role._id) : String(doc.roleId),
    roleName: populated ? (role.name ?? "") : "",
    locationIds: doc.locationIds.map(String),
    active: doc.active,
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
  };
}

export async function listUsers(): Promise<UserView[]> {
  const docs = await User.find().sort({ name: 1 }).populate("roleId", "name").lean<UserLean[]>();
  return docs.map(toView);
}

async function assertRefsExist(roleId?: string, locationIds?: readonly string[]): Promise<void> {
  if (roleId && !(await Role.exists({ _id: roleId }))) throw new AppError("Selected role does not exist", 422);
  if (locationIds?.length) {
    const found = await Location.countDocuments({ _id: { $in: locationIds } });
    if (found !== new Set(locationIds).size) throw new AppError("One or more selected locations do not exist", 422);
  }
}

async function assertAssignableRole(actor: Actor, roleId: string) {
  if (isOwnerAdmin(actor.role)) return;
  const role = await Role.findById(roleId).select("slug builtIn isSystem confidential").lean();
  if (role && (role.isSystem || role.confidential || isOwnerAdmin(role))) {
    throw new AppError("Owner / Admin manages this account or role", 403);
  }
}

export async function createUser(actor: Actor, input: unknown): Promise<UserView> {
  const { password, ...data } = userCreateSchema.parse(input);
  await assertRefsExist(data.roleId, data.locationIds);
  await assertAssignableRole(actor, data.roleId);
  const doc = await User.create({ ...data, passwordHash: await hashPassword(password) });
  const view = await getUserView(String(doc._id));
  await writeAudit(actor, { action: "user.create", entity: "user", entityId: view.id, after: view });
  return view;
}

export async function updateUser(actor: Actor, id: string, input: unknown): Promise<UserView> {
  const { password, ...data } = userUpdateSchema.parse(input);
  const before = await getUserView(id);
  const isSelf = id === actor.id;
  if (isSelf && data.roleId && data.roleId !== before.roleId) throw new AppError("You cannot change your own role", 403);
  if (isSelf && data.active === false) throw new AppError("You cannot deactivate your own account", 403);
  await assertRefsExist(data.roleId, data.locationIds);
  if (!isSelf) await assertAssignableRole(actor, before.roleId);
  if (data.roleId && data.roleId !== before.roleId) await assertAssignableRole(actor, data.roleId);

  const patch = password ? { ...data, passwordHash: await hashPassword(password) } : data;
  const result = await User.updateOne({ _id: id, roleId: before.roleId }, { $set: patch });
  if (!result.matchedCount) throw new AppError("The account changed. Reload and try again.", 409);
  const after = await getUserView(id);
  await writeAudit(actor, {
    action: password ? "user.update+password" : "user.update",
    entity: "user",
    entityId: id,
    before,
    after,
  });
  return after;
}

export async function deactivateUser(actor: Actor, id: string): Promise<UserView> {
  return updateUser(actor, id, { active: false });
}

async function getUserView(id: string): Promise<UserView> {
  if (!Types.ObjectId.isValid(id)) throw new AppError("User not found", 404);
  const doc = await User.findById(id).populate("roleId", "name").lean<UserLean>();
  if (!doc) throw new AppError("User not found", 404);
  return toView(doc);
}
