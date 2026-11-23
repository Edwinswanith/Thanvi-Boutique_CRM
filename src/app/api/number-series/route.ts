import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { listSeries } from "@/server/services/numberSeries";

export const GET = withGuard("system.numbering.view", async () => ok(await listSeries()));
