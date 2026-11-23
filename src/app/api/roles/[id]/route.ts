import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { deleteRole, updateRole } from "@/server/services/roles";

export const PATCH = withGuard<{ id: string }>("system.roles.edit", async (req, { actor, params }) =>
  ok(await updateRole(actor, params.id, await req.json())),
);

export const DELETE = withGuard<{ id: string }>("system.roles.delete", async (_req, { actor, params }) => {
  await deleteRole(actor, params.id);
  return ok({ deleted: true });
});
