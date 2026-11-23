import { withGuard } from "@/server/guard";
import { readPhoto } from "@/server/services/files";

/** Lets content editors preview any photo (including drafts) without inventory access. */
export const GET = withGuard<{ id: string }>("catalog.view", async (_req, { params }) => {
  const { stream, contentType } = await readPhoto(params.id);
  return new Response(stream, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
});
