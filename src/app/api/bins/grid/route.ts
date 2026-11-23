import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createBinGrid } from "@/server/services/bins";

export const POST = withGuard("inventory.create", async (req, { actor }) => ok(await createBinGrid(actor, await req.json()), { status: 201 }));
