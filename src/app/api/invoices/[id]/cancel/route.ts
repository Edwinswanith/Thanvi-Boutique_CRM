import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { cancelInvoice } from "@/server/services/invoiceLifecycle";

export const POST = withGuard<{ id: string }>("sales.edit", async (req, { actor, params }) => {
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  await cancelInvoice(actor, params.id, typeof body.reason === "string" ? body.reason : "");
  return ok({ cancelled: true });
});
