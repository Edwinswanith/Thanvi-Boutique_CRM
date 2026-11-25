import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { sameOrigin } from "@/server/guard";
import { testCheckoutEnabled } from "@/server/services/shopCheckout";
import { quoteShopOrder } from "@/server/services/shopPricing";

export async function POST(req: NextRequest): Promise<Response> {
  if (!testCheckoutEnabled()) return fail("Test checkout is disabled.", 404);
  if (!sameOrigin(req)) return fail("Cross-origin request blocked.", 403);
  try {
    await connectDb();
    return ok(await quoteShopOrder(await req.json().catch(() => null)));
  } catch (error) {
    return handleError(error);
  }
}
