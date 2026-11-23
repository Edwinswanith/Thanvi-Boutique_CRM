import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { updateSeries } from "@/server/services/numberSeries";

export const PATCH = withGuard<{ key: string }>("system.numbering.edit", async (req, { actor, params }) =>
  ok(await updateSeries(actor, decodeURIComponent(params.key), await req.json())),
);
