import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createBin, listBins } from "@/server/services/bins";

export const GET = withGuard("inventory.view", async (req, { actor }) =>
  ok(await listBins(actor, req.nextUrl.searchParams.get("locationId") ?? undefined)),
);
export const POST = withGuard("inventory.create", async (req, { actor }) => ok(await createBin(actor, await req.json()), { status: 201 }));
