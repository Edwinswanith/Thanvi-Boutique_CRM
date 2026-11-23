import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { listInvoices } from "@/server/services/invoiceLifecycle";
import { createInvoice } from "@/server/services/invoices";

export const GET = withGuard("sales.view", async (req, { actor }) => ok(await listInvoices(actor, { q: req.nextUrl.searchParams.get("q") ?? "" })));
export const POST = withGuard("sales.create", async (req, { actor }) => ok(await createInvoice(actor, await req.json()), { status: 201 }));
