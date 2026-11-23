import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { publishedBySlugs } from "@/server/services/storefront";

/** Public: live title/price/photo for bag lines. Only published listings are returned. */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const slugs = (req.nextUrl.searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return ok(await publishedBySlugs(slugs));
  } catch (err) {
    return handleError(err);
  }
}
