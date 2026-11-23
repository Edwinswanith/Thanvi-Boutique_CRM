import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createTransfer, listTransfers } from "@/server/services/transfers";

export const GET = withGuard("transfers.view", async (_req, { actor }) => ok(await listTransfers(actor)));
export const POST = withGuard("transfers.create", async (req, { actor }) => ok(await createTransfer(actor, await req.json()), { status: 201 }));
