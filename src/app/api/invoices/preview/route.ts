import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { previewInvoice } from "@/server/services/invoices";

export const POST = withGuard("sales.create", async (req, { actor }) => ok(await previewInvoice(actor, await req.json())));
