import mongoose, { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { itemCode } from "@/lib/code39";
import { toPaise } from "@/lib/money";
import { receiveSchema } from "@/lib/validation/inventory";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Vendor } from "@/models/Vendor";
import type { Actor } from "@/server/actor";
import { assertLocation } from "@/server/scope";
import { writeAudit } from "./audit";
import { assertBinAt } from "./bins";
import { nextCode } from "./numberSeries";
import { createBillForReceipt } from "./payables";

export interface ReceiptResult {
  receiptRef: string;
  productId: string;
  sku: string;
  codes: string[];
}

/**
 * Goods receipt: one new SKU, N physical pieces with their own codes
 * (SKU-001 … SKU-N), placed in a location (and optionally a bin). All-or-nothing.
 */
export async function receiveStock(actor: Actor, input: unknown): Promise<ReceiptResult> {
  const data = receiveSchema.parse(input);
  assertLocation(actor, data.locationId);
  const [location, vendor] = await Promise.all([
    Location.findOne({ _id: data.locationId, active: true }).lean(),
    Vendor.findOne({ _id: data.vendorId, active: true }).lean(),
  ]);
  if (!location || location.type === "online") throw new AppError("Stock can only be received at an active godown or store", 422);
  if (!vendor) throw new AppError("Vendor not found", 404);
  await assertBinAt(data.binId, data.locationId);

  const session = await mongoose.startSession();
  try {
    let result: ReceiptResult | null = null;
    await session.withTransaction(async () => {
      result = await writeReceipt(actor, data, session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}

type ReceiveData = ReturnType<typeof receiveSchema.parse>;

async function writeReceipt(actor: Actor, data: ReceiveData, session: mongoose.ClientSession): Promise<ReceiptResult> {
  const sku = await nextCode("sku", session);
  const receiptRef = await nextCode("receipt", session);
  const [product] = await Product.create(
    [
      {
        sku,
        name: data.name,
        category: data.category,
        hsn: data.hsn,
        mrp: toPaise(data.mrp),
        costPrice: data.costPrice === null ? null : toPaise(data.costPrice),
        vendorId: data.vendorId,
        color: data.color,
        fabric: data.fabric,
        description: data.description,
        photoIds: data.photoIds,
        createdBy: actor.id,
      },
    ],
    { session },
  );
  const codes = Array.from({ length: data.quantity }, (_, i) => itemCode(sku, i + 1));
  const items = await Item.insertMany(
    codes.map((code) => ({
      code,
      productId: product._id,
      sku,
      vendorId: new Types.ObjectId(data.vendorId),
      locationId: new Types.ObjectId(data.locationId),
      binId: data.binId ? new Types.ObjectId(data.binId) : null,
      status: "available",
      receiptRef,
    })),
    { session },
  );
  await StockMovement.insertMany(
    items.map((it) => ({
      itemId: it._id,
      code: it.code,
      type: "receive",
      toLocationId: it.locationId,
      toBinId: it.binId,
      toStatus: "available",
      reference: receiptRef,
      actorId: actor.id,
      actorName: actor.name,
    })),
    { session },
  );
  await createBillForReceipt(
    actor,
    { vendorId: data.vendorId, locationId: data.locationId, receiptRef, productId: product._id, sku, description: data.name, quantity: codes.length, unitCost: product.costPrice ?? null },
    session,
  );
  await writeAudit(
    actor,
    { action: "stock.receive", entity: "product", entityId: String(product._id), reference: receiptRef, after: { sku, quantity: codes.length } },
    session,
  );
  return { receiptRef, productId: String(product._id), sku, codes };
}
