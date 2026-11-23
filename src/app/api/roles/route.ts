import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createRole, listRoles } from "@/server/services/roles";

export const GET = withGuard("system.roles.view", async () => ok(await listRoles()));

export const POST = withGuard("system.roles.create", async (req, { actor }) =>
  ok(await createRole(actor, await req.json()), { status: 201 }),
);
