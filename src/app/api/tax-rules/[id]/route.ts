import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { saveTaxRule } from "@/server/services/taxSettings";

export const PATCH = withGuard<{ id: string }>("taxes.edit", async (req, { actor, params }) => ok(await saveTaxRule(actor, params.id, await req.json())));
