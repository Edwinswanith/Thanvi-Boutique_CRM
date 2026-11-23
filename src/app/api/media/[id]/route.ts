import { fail, handleError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { readPhoto } from "@/server/services/files";
import { isPublishedPhoto } from "@/server/services/storefront";

/**
 * Public product photos for the storefront. Only photos used by a *published*
 * listing are served, so draft content and internal stock photos stay private.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await ctx.params;
    await connectDb();
    if (!(await isPublishedPhoto(id))) return fail("Photo not found", 404);
    const { stream, contentType } = await readPhoto(id);
    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
