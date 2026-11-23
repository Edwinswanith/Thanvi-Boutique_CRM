import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { removeDemoCatalog, seedDemoCatalog } from "@/server/seed/demoCatalog";
import { removeDemoSales, seedDemoSales } from "@/server/seed/demoSales";
import { removeDemoUsers, seedDemoUsers } from "@/server/seed/demoUsers";

/** npm run seed:demo            → add the 28 showcase sarees, 90 days of sample sales and one login per role
 *  npm run seed:demo -- --remove → take them all out again (before go-live) */
async function main(): Promise<void> {
  await connectDb();
  if (process.argv.includes("--remove")) {
    console.log(`Removed ${await removeDemoUsers()} demo logins`);
    console.log(`Removed ${await removeDemoSales()} demo invoices`);
    console.log(`Removed ${await removeDemoCatalog()} demo listings`);
    return;
  }
  const { created, skipped } = await seedDemoCatalog(path.join(process.cwd(), "seed-assets", "demo-sarees"));
  console.log(`Demo catalog: ${created} sarees added, ${skipped} already there`);
  const sales = await seedDemoSales();
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (demoPassword) console.log(`Demo logins: ${(await seedDemoUsers(demoPassword)).length} added (demo-<role>@thanvi.test)`);
  else console.log("Demo logins: skipped (set SEED_DEMO_PASSWORD in .env.local to create one login per role)");
  console.log(sales.skipped ? "Demo sales: already there" : `Demo sales: ${sales.created} sample invoices added`);
}

main()
  .catch((err: unknown) => {
    console.error("Demo seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
