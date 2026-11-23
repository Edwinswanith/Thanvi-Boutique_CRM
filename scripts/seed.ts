import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { runSeed, type SeedAccount } from "@/server/seed/run";

function accountsFromEnv(): SeedAccount[] {
  const pairs: Array<[string, string, string, string]> = [
    ["SEED_SUPERADMIN_EMAIL", "SEED_SUPERADMIN_PASSWORD", "Super Admin", "super-admin"],
    ["SEED_OWNER_EMAIL", "SEED_OWNER_PASSWORD", "Owner", "owner"],
  ];
  return pairs.flatMap(([emailKey, passKey, name, roleSlug]) => {
    const email = process.env[emailKey];
    const password = process.env[passKey];
    if (!email || !password) {
      console.warn(`Skipping ${name} account: set ${emailKey} and ${passKey} in .env.local`);
      return [];
    }
    if (password.length < 10) throw new Error(`${passKey} must be at least 10 characters`);
    return [{ email, password, name, roleSlug }];
  });
}

async function main(): Promise<void> {
  await connectDb();
  const result = await runSeed(accountsFromEnv());
  console.log(`Seeded: ${result.roles} roles, ${result.locations} locations, ${result.series} number series`);
  if (result.migrations.length) console.log(`Migrations applied: ${result.migrations.join(", ")}`);
  console.log(result.users.length ? `Created users: ${result.users.join(", ")}` : "No new users created");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
