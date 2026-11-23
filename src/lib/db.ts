import mongoose from "mongoose";
import { env } from "./env";

declare global {
  var __mongoosePromise: Promise<typeof mongoose> | undefined;
}

/** Shared connection; cached on globalThis so Next.js dev hot-reload doesn't open new pools. */
export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!globalThis.__mongoosePromise) {
    const { MONGODB_URI, MONGODB_DB } = env();
    globalThis.__mongoosePromise = mongoose
      .connect(MONGODB_URI, { dbName: MONGODB_DB, serverSelectionTimeoutMS: 15000 })
      .catch((err) => {
        globalThis.__mongoosePromise = undefined;
        throw err;
      });
  }
  return globalThis.__mongoosePromise;
}
