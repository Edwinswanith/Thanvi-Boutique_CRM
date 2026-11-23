import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { getTransfer } from "@/server/services/transfers";

export const GET = withGuard<{ id: string }>("transfers.view", async (_req, { actor, params }) => ok(await getTransfer(actor, params.id)));
