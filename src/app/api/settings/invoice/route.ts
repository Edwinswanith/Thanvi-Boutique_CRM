import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { getInvoiceSettings, updateInvoiceSettings } from "@/server/services/taxSettings";

export const GET = withGuard("taxes.view", async () => ok(await getInvoiceSettings()));
export const PUT = withGuard("taxes.edit", async (req, { actor }) => ok(await updateInvoiceSettings(actor, await req.json())));
