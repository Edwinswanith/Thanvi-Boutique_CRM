import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { deactivateUser, updateUser } from "@/server/services/users";

export const PATCH = withGuard<{ id: string }>("system.users.edit", async (req, { actor, params }) =>
  ok(await updateUser(actor, params.id, await req.json())),
);

/** Users are deactivated, never hard-deleted, so their audit history stays intact. */
export const DELETE = withGuard<{ id: string }>("system.users.delete", async (_req, { actor, params }) =>
  ok(await deactivateUser(actor, params.id)),
);
