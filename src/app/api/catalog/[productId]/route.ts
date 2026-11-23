import { fail, ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { getListingEditor, saveListing } from "@/server/services/catalog";

type Params = { productId: string };

export const GET = withGuard<Params>("catalog.view", async (_req, { actor, params }) => ok(await getListingEditor(actor, params.productId)));

export const PUT = withGuard<Params>("catalog.edit", async (req, { actor, params }) => {
  const body: unknown = await req.json().catch(() => null);
  if (!body) return fail("Invalid request body", 400);
  return ok(await saveListing(actor, params.productId, body));
});
