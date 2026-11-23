import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { moveItemToBin } from "@/server/services/items";

export const PATCH = withGuard<{ code: string }>("inventory.edit", async (req, { actor, params }) =>
  ok(await moveItemToBin(actor, decodeURIComponent(params.code), await req.json())),
);
