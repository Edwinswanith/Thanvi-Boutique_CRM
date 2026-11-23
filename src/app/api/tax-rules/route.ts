import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { listTaxRules, saveTaxRule } from "@/server/services/taxSettings";

export const GET = withGuard("taxes.view", async () => ok(await listTaxRules()));
export const POST = withGuard("taxes.create", async (req, { actor }) => ok(await saveTaxRule(actor, null, await req.json()), { status: 201 }));
