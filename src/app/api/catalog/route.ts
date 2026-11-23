import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { listCatalog } from "@/server/services/catalog";

export const GET = withGuard("catalog.view", async (req, { actor }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  return ok(await listCatalog(actor, params));
});
