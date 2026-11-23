import { ok } from "@/lib/api";
import { parseRange } from "@/lib/analytics/periods";
import { withGuard } from "@/server/guard";
import { salesOverview } from "@/server/services/analytics";

export const GET = withGuard("dashboard.view", async (req, { actor }) => {
  const sp = req.nextUrl.searchParams;
  return ok(await salesOverview(actor, { range: parseRange(sp.get("range")), locationId: sp.get("locationId") || null }));
});
