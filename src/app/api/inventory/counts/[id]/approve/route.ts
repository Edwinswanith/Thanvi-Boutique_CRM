import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { approveStockCount } from "@/server/services/stockCounts";

export const POST = withGuard<{ id: string }>("counts.approve", async (_request, { actor, params }) => {
  await approveStockCount(actor, params.id);
  return ok({ approved: true });
});
