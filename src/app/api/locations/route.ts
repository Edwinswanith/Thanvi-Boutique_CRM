import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createLocation, listLocations } from "@/server/services/locations";

export const GET = withGuard("system.locations.view", async () => ok(await listLocations()));

export const POST = withGuard("system.locations.create", async (req, { actor }) =>
  ok(await createLocation(actor, await req.json()), { status: 201 }),
);
