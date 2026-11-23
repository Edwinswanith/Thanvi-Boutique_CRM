import { ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { listBills } from "@/server/services/payables";

export const GET = withGuard("payables.view", async (req, { actor }) => {
  const sp = req.nextUrl.searchParams;
  return ok(await listBills(actor, { status: sp.get("status") ?? undefined, vendorId: sp.get("vendorId") ?? undefined }));
});
