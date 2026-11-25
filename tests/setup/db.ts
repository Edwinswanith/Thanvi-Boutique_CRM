import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { Role } from "@/models/Role";
import type { Actor } from "@/server/actor";
import { runSeed } from "@/server/seed/run";

let replSet: MongoMemoryReplSet;

/** In-memory replica set (so transactions work) with fresh seed data before each test. */
export function setupTestDb(): void {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
    await mongoose.connect(replSet.getUri(), { dbName: "tb_test" });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
    await runSeed([]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });
}

export async function actorWithRole(slug: string, overrides: Partial<Actor> = {}): Promise<Actor> {
  const role = await Role.findOne({ slug }).lean();
  if (!role) throw new Error(`role ${slug} missing`);
  return {
    id: new mongoose.Types.ObjectId().toString(),
    name: `Test ${slug}`,
    email: `${slug}@test.local`,
    role: {
      id: String(role._id),
      name: role.name,
      slug: role.slug,
      builtIn: role.builtIn,
      permissions: role.permissions,
      isSystem: role.isSystem,
      confidential: role.confidential,
      allLocations: role.allLocations,
    },
    locationIds: [],
    ...overrides,
  };
}
