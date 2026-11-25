import mongoose, { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { itemCode } from "@/lib/code39";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
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
import { acceptsVendorStock } from "./myLocations";

export interface ReceiptResult {
  receiptRef: string;
  productId: string;
  sku: string;
  codes: string[];
}

/**
 * Receive new pieces under a new or existing SKU in one transaction.
 */
export async function receiveStock(actor: Actor, input: unknown): Promise<ReceiptResult> {
  const data = receiveSchema.parse(input);
  assertLocation(actor, data.locationId);
  if (data.costPrice !== null && !actor.role.confidential) throw new AppError("Purchase cost requires confidential access", 403);
  const [location, vendor] = await Promise.all([
    Location.findOne({ _id: data.locationId, active: true }).lean(),
    Vendor.findOne({ _id: data.vendorId, active: true }).lean(),
  ]);
  if (!location || location.type === "online") throw new AppError("Stock can only be received at an active godown or store", 422);
  if (!isOwnerAdmin(actor.role) && !acceptsVendorStock(location)) throw new AppError("Vendor deliveries go to a designated receiving godown", 403);
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
  // The receipt counter serializes concurrent receipts before looking up piece codes.
  const receiptRef = await nextCode("receipt", session);
  const unitCost = data.costPrice === null ? null : toPaise(data.costPrice);
  const restock = data.existingSku;
  const product = restock !== undefined
    ? await Product.findOne({ sku: restock }).session(session)
    : (await Product.create([{
      sku: await nextCode("sku", session),
      name: data.name,
      category: data.category,
      hsn: data.hsn,
      mrp: toPaise(data.mrp),
      costPrice: unitCost,
      vendorId: data.vendorId,
      color: data.color,
      fabric: data.fabric,
      description: data.description,
      photoIds: data.photoIds,
      createdBy: actor.id,
    }], { session }))[0];
  if (!product) throw new AppError("SKU not found. Check the existing product's SKU.", 404);
  const { sku } = product;
  let lastPiece = 0;
  if (restock) {
    const prefix = `${sku}-`;
    const codes = await Item.distinct("code", { productId: product._id }).session(session);
    for (const code of codes) {
      if (!code.startsWith(prefix)) continue;
      const suffix = code.slice(prefix.length);
      if (/^\d+$/.test(suffix)) lastPiece = Math.max(lastPiece, Number(suffix));
    }
  }
  const codes = Array.from({ length: data.quantity }, (_, i) => itemCode(sku, lastPiece + i + 1));
  const items = await Item.insertMany(
    codes.map((code) => ({
      code,
      productId: product._id,
      sku,
      vendorId: new Types.ObjectId(data.vendorId),
      purchaseCost: unitCost,
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
      note: restock ? data.description : "",
      actorId: actor.id,
      actorName: actor.name,
    })),
    { session },
  );
  await createBillForReceipt(
    actor,
    { vendorId: data.vendorId, locationId: data.locationId, receiptRef, productId: product._id, sku, description: product.name, quantity: codes.length, unitCost },
    session,
  );
  await writeAudit(
    actor,
    { action: "stock.receive", entity: "product", entityId: String(product._id), reference: receiptRef, after: { sku, quantity: codes.length } },
    session,
  );
  return { receiptRef, productId: String(product._id), sku, codes };
}
