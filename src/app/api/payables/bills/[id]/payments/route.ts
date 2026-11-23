import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { recordPayment } from "@/server/services/payables";

export const POST = withGuard<{ id: string }>("payables.create", async (req, { actor, params }) =>
  ok(await recordPayment(actor, params.id, await req.json()), { status: 201 }));
