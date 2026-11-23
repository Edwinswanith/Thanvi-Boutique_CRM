import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { createVendor, listVendors } from "@/server/services/vendors";

export const GET = withGuard("vendors.view", async () => ok(await listVendors()));
export const POST = withGuard("vendors.create", async (req, { actor }) => ok(await createVendor(actor, await req.json()), { status: 201 }));
