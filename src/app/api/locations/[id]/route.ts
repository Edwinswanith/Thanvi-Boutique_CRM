import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { updateLocation } from "@/server/services/locations";

export const PATCH = withGuard<{ id: string }>("system.locations.edit", async (req, { actor, params }) =>
  ok(await updateLocation(actor, params.id, await req.json())),
);
