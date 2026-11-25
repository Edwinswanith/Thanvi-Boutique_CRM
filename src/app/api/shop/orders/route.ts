import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { sameOrigin } from "@/server/guard";
import { placeTestOrder, testCheckoutEnabled } from "@/server/services/shopCheckout";

export async function POST(req: NextRequest): Promise<Response> {
  if (!testCheckoutEnabled()) return fail("Test checkout is disabled.", 404);
  if (!sameOrigin(req)) return fail("Cross-origin request blocked.", 403);
  try {
    const body: unknown = await req.json().catch(() => null);
    await connectDb();
    return ok(await placeTestOrder(body));
  } catch (error) {
    return handleError(error);
  }
}
