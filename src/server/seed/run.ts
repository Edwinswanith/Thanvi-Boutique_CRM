import { Location } from "@/models/Location";
import { NumberSeries } from "@/models/NumberSeries";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { hashPassword } from "@/server/auth/password";
import { DEFAULT_LOCATIONS, DEFAULT_ROLES, DEFAULT_SERIES } from "./defaults";
import { runMigrations } from "./migrations";

export interface SeedAccount {
  email: string;
  password: string;
  name: string;
  roleSlug: string;
}

export interface SeedResult {
  roles: number;
  locations: number;
  series: number;
  users: string[];
  migrations: string[];
}

/**
 * Idempotent: inserts defaults only where missing ($setOnInsert), so re-running
 * never overwrites changes the client has made in the app.
 */
export async function runSeed(accounts: readonly SeedAccount[]): Promise<SeedResult> {
  for (const role of DEFAULT_ROLES) {
    await Role.updateOne({ slug: role.slug }, { $setOnInsert: role }, { upsert: true });
  }
  for (const loc of DEFAULT_LOCATIONS) {
    await Location.updateOne({ code: loc.code }, { $setOnInsert: { ...loc, invoicePrefix: `${loc.code}-` } }, { upsert: true });
    if (loc.type !== "godown") {
      const key = `invoice:${loc.code}`;
      await NumberSeries.updateOne(
        { key },
        { $setOnInsert: { key, label: `Invoices — ${loc.code}`, prefix: `${loc.code}-`, next: 1, padding: 5 } },
        { upsert: true },
      );
    }
  }
  for (const s of DEFAULT_SERIES) {
    await NumberSeries.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }
  const migrations = await runMigrations();
  const users: string[] = [];
  for (const acc of accounts) {
    const role = await Role.findOne({ slug: acc.roleSlug }).lean();
    if (!role) throw new Error(`Seed role ${acc.roleSlug} missing`);
    const exists = await User.exists({ email: acc.email.toLowerCase() });
    if (exists) continue;
    await User.create({ name: acc.name, email: acc.email, passwordHash: await hashPassword(acc.password), roleId: role._id });
    users.push(acc.email);
  }
  return {
    roles: await Role.countDocuments(),
    locations: await Location.countDocuments(),
    series: await NumberSeries.countDocuments(),
    users,
    migrations,
  };
}
