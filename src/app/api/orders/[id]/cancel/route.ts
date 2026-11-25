import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { cancelTestOrder } from "@/server/services/shopCheckout";

export const POST = withGuard<{ id: string }>("orders.edit", async (_request, { actor, params }) => {
  await cancelTestOrder(actor, params.id);
  return ok({ cancelled: true });
});
