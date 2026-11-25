import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { cancelStockCount, saveStockCount } from "@/server/services/stockCounts";

export const PATCH = withGuard<{ id: string }>("counts.edit", async (request, { actor, params }) =>
  ok(await saveStockCount(actor, params.id, await request.json())),
);

export const DELETE = withGuard<{ id: string }>("counts.edit", async (_request, { actor, params }) => {
  await cancelStockCount(actor, params.id);
  return ok({ cancelled: true });
});
