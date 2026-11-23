import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { getBill, updateBill } from "@/server/services/payables";

export const GET = withGuard<{ id: string }>("payables.view", async (_req, { actor, params }) => ok(await getBill(actor, params.id)));
export const PATCH = withGuard<{ id: string }>("payables.edit", async (req, { actor, params }) => ok(await updateBill(actor, params.id, await req.json())));
