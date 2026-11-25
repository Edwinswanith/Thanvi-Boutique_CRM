import mongoose from "mongoose";
import { AppError } from "@/lib/api";
import { locationCreateSchema, locationUpdateSchema } from "@/lib/validation/schemas";
import { Location, type LocationType } from "@/models/Location";
import { NumberSeries } from "@/models/NumberSeries";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";
import { acceptsVendorStock } from "./myLocations";

export interface LocationView {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  phone: string;
  gstin: string;
  invoicePrefix: string;
  acceptsVendorStock: boolean;
  active: boolean;
  createdAt: string;
}

type LocationLean = Omit<LocationView, "id" | "createdAt"> & { _id: mongoose.Types.ObjectId; createdAt?: Date };

function toView(doc: LocationLean): LocationView {
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    type: doc.type,
    address: doc.address ?? "",
    city: doc.city ?? "",
    phone: doc.phone ?? "",
    gstin: doc.gstin ?? "",
    invoicePrefix: doc.invoicePrefix ?? "",
    acceptsVendorStock: acceptsVendorStock(doc),
    active: doc.active,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : "",
  };
}

export async function listLocations(): Promise<LocationView[]> {
  const docs = await Location.find().sort({ type: 1, code: 1 }).lean<LocationLean[]>();
  return docs.map(toView);
}

/**
 * Store-creation wizard backend: creates the location and its own invoice
 * number series in one transaction, so a new store can bill immediately.
 */
export async function createLocation(actor: Actor, input: unknown): Promise<LocationView> {
  const data = locationCreateSchema.parse(input);
  const invoicePrefix = data.invoicePrefix || `${data.code}-`;
  const session = await mongoose.startSession();
  try {
    let created: LocationLean | null = null;
    await session.withTransaction(async () => {
      const [doc] = await Location.create([{ ...data, invoicePrefix }], { session });
      created = doc.toObject() as LocationLean;
      if (data.type !== "godown") {
        await ensureInvoiceSeries(data.code, invoicePrefix, session);
      }
      await writeAudit(actor, { action: "location.create", entity: "location", entityId: String(doc._id), after: created }, session);
    });
    return toView(created!);
  } finally {
    await session.endSession();
  }
}

async function ensureInvoiceSeries(code: string, prefix: string, session: mongoose.ClientSession): Promise<void> {
  await NumberSeries.updateOne(
    { key: `invoice:${code}` },
    { $setOnInsert: { key: `invoice:${code}`, label: `Invoices — ${code}`, prefix, next: 1, padding: 5 } },
    { upsert: true, session },
  );
}

export async function updateLocation(actor: Actor, id: string, input: unknown): Promise<LocationView> {
  const data = locationUpdateSchema.parse(input);
  if (data.code !== undefined) throw new AppError("Location code cannot be changed after creation", 422);
  const before = await Location.findById(id).lean<LocationLean>();
  if (!before) throw new AppError("Location not found", 404);
  const updated = await Location.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" }).lean<LocationLean>();
  await writeAudit(actor, { action: "location.update", entity: "location", entityId: id, before, after: updated });
  return toView(updated!);
}
