import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { startStockCount } from "@/server/services/stockCounts";

export const POST = withGuard("counts.create", async (request, { actor }) =>
  ok(await startStockCount(actor, await request.json()), { status: 201 }),
);
