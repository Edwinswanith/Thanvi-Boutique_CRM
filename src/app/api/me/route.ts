import { fail, handleError, ok } from "@/lib/api";
import { currentActor } from "@/server/auth/actor";

export async function GET(): Promise<Response> {
  try {
    const actor = await currentActor();
    if (!actor) return fail("Please sign in", 401);
    return ok({
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: { name: actor.role.name, isSystem: actor.role.isSystem, confidential: actor.role.confidential },
      permissions: actor.role.permissions,
      locationIds: actor.locationIds,
    });
  } catch (err) {
    return handleError(err);
  }
}
