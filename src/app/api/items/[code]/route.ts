import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { itemHistory, lookupItem } from "@/server/services/items";

export const GET = withGuard<{ code: string }>("inventory.view", async (_req, { actor, params }) => {
  const code = decodeURIComponent(params.code);
  return ok({ item: await lookupItem(actor, code), history: await itemHistory(actor, code) });
});
