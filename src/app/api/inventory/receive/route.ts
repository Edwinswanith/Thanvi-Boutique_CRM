import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { receiveStock } from "@/server/services/receiving";

export const POST = withGuard("inventory.create", async (req, { actor }) => ok(await receiveStock(actor, await req.json()), { status: 201 }));
