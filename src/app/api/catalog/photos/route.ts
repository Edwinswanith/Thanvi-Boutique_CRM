import { fail, ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { savePhoto } from "@/server/services/files";

/** Website photo upload (JPEG/PNG/WebP, max 5 MB, content-checked). */
export const POST = withGuard("catalog.edit", async (req, { actor }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Attach a photo", 422);
  return ok({ id: await savePhoto(file, actor.id) }, { status: 201 });
});
