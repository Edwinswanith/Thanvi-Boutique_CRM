import { withGuard } from "@/server/guard";
import { readPhoto } from "@/server/services/files";

export const GET = withGuard<{ id: string }>("inventory.view", async (_req, { params }) => {
  const { stream, contentType } = await readPhoto(params.id);
  return new Response(stream, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
});
