import mongoose from "mongoose";
import { E2E_DB } from "../playwright.config";
import path from "node:path";
import { seedDemoCatalog } from "../src/server/seed/demoCatalog";
import { runSeed } from "../src/server/seed/run";
import { E2E_USERS } from "./users";

/** Resets the dedicated e2e database and seeds it with known test accounts and the demo shop catalog. */
export default async function globalSetup(): Promise<void> {
  process.loadEnvFile?.(".env.local");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env.local");
  await mongoose.connect(uri, { dbName: E2E_DB });
  if (mongoose.connection.name !== E2E_DB) throw new Error("Refusing to reset a non-e2e database");
  await mongoose.connection.db!.dropDatabase();
  await runSeed(Object.values(E2E_USERS));
  await seedDemoCatalog(path.join(process.cwd(), "seed-assets", "demo-sarees"));
  await mongoose.disconnect();
}
