import { fail, ok } from "@/lib/api";
import { withGuard } from "@/server/guard";
import { savePhoto } from "@/server/services/files";

export const POST = withGuard("inventory.create", async (req, { actor }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Attach a photo", 422);
  return ok({ id: await savePhoto(file, actor.id) }, { status: 201 });
});
