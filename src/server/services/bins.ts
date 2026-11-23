import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { binCreateSchema, binGridSchema } from "@/lib/validation/inventory";
import { Bin } from "@/models/Bin";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import type { Actor } from "@/server/actor";
import { assertLocation, locationFilter } from "@/server/scope";
import { writeAudit } from "./audit";

export interface BinView {
  id: string;
  locationId: string;
  code: string;
  zone: string;
  description: string;
  pieces: number;
}

interface BinLean {
  _id: Types.ObjectId;
  locationId: Types.ObjectId;
  code: string;
  zone?: string | null;
  description?: string | null;
}

export async function listBins(actor: Actor, locationId?: string): Promise<BinView[]> {
  if (locationId) assertLocation(actor, locationId);
  const filter = locationId ? { locationId: new Types.ObjectId(locationId) } : locationFilter(actor);
  const bins = await Bin.find({ ...filter, active: true }).sort({ code: 1 }).lean<BinLean[]>();
  const counts = await Item.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { binId: { $in: bins.map((b) => b._id) }, status: { $in: ["available", "reserved"] } } },
    { $group: { _id: "$binId", n: { $sum: 1 } } },
  ]);
  const byBin = new Map(counts.map((c) => [String(c._id), c.n]));
  return bins.map((b) => ({
    id: String(b._id),
    locationId: String(b.locationId),
    code: b.code,
    zone: b.zone ?? "",
    description: b.description ?? "",
    pieces: byBin.get(String(b._id)) ?? 0,
  }));
}

async function assertStockLocation(locationId: string): Promise<void> {
  if (!(await Location.exists({ _id: locationId, active: true }))) throw new AppError("Location not found or inactive", 404);
}

export async function createBin(actor: Actor, input: unknown): Promise<BinView> {
  const data = binCreateSchema.parse(input);
  assertLocation(actor, data.locationId);
  await assertStockLocation(data.locationId);
  const doc = await Bin.create(data);
  await writeAudit(actor, { action: "bin.create", entity: "bin", entityId: String(doc._id), reference: data.code });
  return { id: String(doc._id), locationId: data.locationId, code: doc.code, zone: data.zone, description: data.description, pieces: 0 };
}

/** Creates a rack × shelf grid of bins, skipping codes that already exist. */
export async function createBinGrid(actor: Actor, input: unknown): Promise<{ created: number }> {
  const data = binGridSchema.parse(input);
  assertLocation(actor, data.locationId);
  await assertStockLocation(data.locationId);
  const ops = [];
  for (let r = 1; r <= data.racks; r++) {
    for (let s = 1; s <= data.shelves; s++) {
      const code = `${data.prefix}${r}-S${s}`;
      ops.push({
        updateOne: {
          filter: { locationId: new Types.ObjectId(data.locationId), code },
          update: { $setOnInsert: { locationId: new Types.ObjectId(data.locationId), code, zone: data.zone } },
          upsert: true,
        },
      });
    }
  }
  const res = await Bin.bulkWrite(ops);
  await writeAudit(actor, { action: "bin.grid", entity: "bin", reference: `${data.prefix} ${data.racks}x${data.shelves}`, after: { created: res.upsertedCount } });
  return { created: res.upsertedCount };
}

export async function assertBinAt(binId: string | null, locationId: string): Promise<void> {
  if (!binId) return;
  const bin = await Bin.findOne({ _id: binId, locationId, active: true }).lean();
  if (!bin) throw new AppError("That bin is not in this location", 422);
}
