import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { removeDemoCatalog, seedDemoCatalog } from "@/server/seed/demoCatalog";

/** npm run seed:demo            → add the 28 showcase sarees to the website
 *  npm run seed:demo -- --remove → take them all out again (before go-live) */
async function main(): Promise<void> {
  await connectDb();
  if (process.argv.includes("--remove")) {
    console.log(`Removed ${await removeDemoCatalog()} demo listings`);
    return;
  }
  const { created, skipped } = await seedDemoCatalog(path.join(process.cwd(), "seed-assets", "demo-sarees"));
  console.log(`Demo catalog: ${created} sarees added, ${skipped} already there`);
}

main()
  .catch((err: unknown) => {
    console.error("Demo seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
