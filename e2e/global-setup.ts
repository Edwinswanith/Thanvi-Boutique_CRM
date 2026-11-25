import mongoose from "mongoose";
import { E2E_DB } from "../playwright.config";
import path from "node:path";
import { Item } from "../src/models/Item";
import { Location } from "../src/models/Location";
import { Product } from "../src/models/Product";
import { User } from "../src/models/User";
import { seedDemoCatalog } from "../src/server/seed/demoCatalog";
import { seedDemoPayables } from "../src/server/seed/demoPayables";
import { seedDemoSales } from "../src/server/seed/demoSales";
import { runSeed } from "../src/server/seed/run";
import { E2E_USERS } from "./users";

/** Resets the dedicated e2e database and seeds it with known test accounts the demo shop catalog and sample sales. */
export default async function globalSetup(): Promise<void> {
  process.loadEnvFile?.(".env.local");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env.local");
  await mongoose.connect(uri, { dbName: E2E_DB });
  if (mongoose.connection.name !== E2E_DB) throw new Error("Refusing to reset a non-e2e database");
  await mongoose.connection.db!.dropDatabase();
  await runSeed(Object.values(E2E_USERS));
  for (const user of Object.values(E2E_USERS)) {
    if ("locationCodes" in user) {
      const locations = await Location.find({ code: { $in: user.locationCodes } }, { _id: 1 }).lean();
      await User.updateOne({ email: user.email }, { $set: { locationIds: locations.map((location) => location._id) } });
    }
  }
  await seedDemoCatalog(path.join(process.cwd(), "seed-assets", "demo-sarees"));
  const online = await Location.findOne({ code: "WEB" }).orFail();
  const products = await Product.find({ name: /Pochampally Pattu|Kota Cotton/i }).lean();
  await Item.insertMany(products.flatMap((product) => [1, 2].map((piece) => ({
    code: `${product.sku}-WEB-${piece}`,
    productId: product._id,
    sku: product.sku,
    vendorId: product.vendorId,
    locationId: online._id,
    status: "available",
  }))));
  await seedDemoSales();
  await seedDemoPayables();
  await mongoose.disconnect();
}
