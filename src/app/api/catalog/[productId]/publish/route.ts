import { fail, ok } from "@/lib/api";
import { publishSchema } from "@/lib/validation/catalog";
import { withGuard } from "@/server/guard";
import { setPublished } from "@/server/services/catalog";

/** Publishing is a separate permission (catalog.approve) so a business can split writing from going live. */
export const POST = withGuard<{ productId: string }>("catalog.approve", async (req, { actor, params }) => {
  const body: unknown = await req.json().catch(() => null);
  if (!body) return fail("Invalid request body", 400);
  const { publish } = publishSchema.parse(body);
  return ok(await setPublished(actor, params.productId, publish));
});
