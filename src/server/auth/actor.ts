import { Types } from "mongoose";
import { cookies } from "next/headers";
import { connectDb } from "@/lib/db";
import { AppError } from "@/lib/api";
import { loginSchema } from "@/lib/validation/schemas";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import type { Actor } from "@/server/actor";
import { verifyPassword } from "./password";
import { SESSION_COOKIE, verifySession } from "./session";

interface RoleLean {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  builtIn: boolean;
  permissions: string[];
  isSystem: boolean;
  confidential: boolean;
  allLocations: boolean;
}

/** Loads the actor fresh from the DB so role/permission changes apply on the next request. */
export async function loadActor(userId: string): Promise<Actor | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).lean();
  if (!user || !user.active) return null;
  const role = await Role.findById(user.roleId).lean<RoleLean>();
  if (!role) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: {
      id: String(role._id),
      name: role.name,
      slug: role.slug,
      builtIn: role.builtIn,
      permissions: role.permissions,
      isSystem: role.isSystem,
      confidential: role.confidential,
      allLocations: role.allLocations,
    },
    locationIds: user.locationIds.map(String),
  };
}

/** For server components and route handlers: the signed-in actor, or null. */
export async function currentActor(): Promise<Actor | null> {
  const jar = await cookies();
  const userId = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  await connectDb();
  return loadActor(userId);
}

/** Verifies credentials. Uses one generic error so attackers can't probe which emails exist. */
export async function authenticate(input: unknown): Promise<Actor> {
  const { email, password } = loginSchema.parse(input);
  const user = await User.findOne({ email }).select("+passwordHash").lean();
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid || !user.active) throw new AppError("Invalid email or password", 401);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const actor = await loadActor(String(user._id));
  if (!actor) throw new AppError("Invalid email or password", 401);
  return actor;
}
