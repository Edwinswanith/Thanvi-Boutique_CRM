import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createUser, listUsers } from "@/server/services/users";

export const GET = withGuard("system.users.view", async () => ok(await listUsers()));

export const POST = withGuard("system.users.create", async (req, { actor }) =>
  ok(await createUser(actor, await req.json()), { status: 201 }),
);
