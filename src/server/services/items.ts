import mongoose, { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { moveBinSchema } from "@/lib/validation/inventory";
import { Bin } from "@/models/Bin";
import { Item, type ItemStatus } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Vendor } from "@/models/Vendor";
import { canAccessLocation, type Actor } from "@/server/actor";
import { assertBinAt } from "./bins";
import { transitionItem } from "./stockLedger";

export interface ItemView {
  id: string;
  code: string;
  status: ItemStatus;
  sku: string;
  productId: string;
  name: string;
  category: string;
  hsn: string;
  mrp: number;
  costPrice: number | null;
  color: string;
  fabric: string;
  photoIds: string[];
  vendor: { code: string; name: string };
  location: { id: string; code: string; name: string; type: string };
  bin: { id: string; code: string; zone: string } | null;
  receiptRef: string;
  receivedAt: string;
}

export interface MovementView {
  at: string;
  type: string;
  from: string;
  to: string;
  fromStatus: string;
  toStatus: string;
  reference: string;
  note: string;
  actor: string;
}

async function nameMaps(locationIds: unknown[], binIds: unknown[]) {
  const [locs, bins] = await Promise.all([
    Location.find({ _id: { $in: locationIds } }, { code: 1, name: 1, type: 1 }).lean(),
    Bin.find({ _id: { $in: binIds } }, { code: 1, zone: 1 }).lean(),
  ]);
  return { locs: new Map(locs.map((l) => [String(l._id), l])), bins: new Map(bins.map((b) => [String(b._id), b])) };
}

/** What a scan shows: the piece, its product, and exactly where it is (location + bin). */
export async function lookupItem(actor: Actor, rawCode: string): Promise<ItemView> {
  const code = rawCode.trim().toUpperCase();
  const item = await Item.findOne({ code }).select(actor.role.confidential ? "+purchaseCost" : "").lean();
  if (!item) throw new AppError(`No piece with code ${code}`, 404);
  const { locs, bins } = await nameMaps([item.locationId], item.binId ? [item.binId] : []);
  const loc = locs.get(String(item.locationId));
  if (!canAccessLocation(actor, String(item.locationId))) {
    throw new AppError(`${code} is at ${loc?.name ?? "another location"}, outside your locations`, 403);
  }
  const product = await Product.findById(item.productId).select(actor.role.confidential ? "+costPrice" : "").lean();
  const vendor = await Vendor.findById(item.vendorId, { code: 1, name: 1 }).lean();
  const bin = item.binId ? bins.get(String(item.binId)) : null;
  return {
    id: String(item._id),
    code: item.code,
    status: item.status,
    sku: item.sku,
    productId: String(item.productId),
    name: product?.name ?? "",
    category: product?.category ?? "",
    hsn: product?.hsn ?? "",
    mrp: product?.mrp ?? 0,
    costPrice: actor.role.confidential ? (item.purchaseCost === undefined ? product?.costPrice ?? null : item.purchaseCost) : null,
    color: product?.color ?? "",
    fabric: product?.fabric ?? "",
    photoIds: product?.photoIds ?? [],
    vendor: { code: vendor?.code ?? "", name: vendor?.name ?? "" },
    location: { id: String(item.locationId), code: loc?.code ?? "", name: loc?.name ?? "", type: loc?.type ?? "" },
    bin: bin ? { id: String(bin._id), code: bin.code, zone: bin.zone ?? "" } : null,
    receiptRef: item.receiptRef ?? "",
    receivedAt: item.createdAt ? new Date(item.createdAt).toISOString() : "",
  };
}

export async function itemHistory(actor: Actor, code: string): Promise<MovementView[]> {
  await lookupItem(actor, code); // enforces access
  const rows = await StockMovement.find({ code: code.toUpperCase() }).sort({ createdAt: 1 }).lean();
  const { locs, bins } = await nameMaps(
    rows.flatMap((r) => [r.fromLocationId, r.toLocationId]).filter(Boolean),
    rows.flatMap((r) => [r.fromBinId, r.toBinId]).filter(Boolean),
  );
  const place = (loc: unknown, bin: unknown) => {
    if (!loc) return "—";
    const l = locs.get(String(loc));
    const b = bin ? bins.get(String(bin)) : null;
    return `${l?.name ?? "?"}${b ? ` · ${b.code}` : ""}`;
  };
  return rows.map((r) => ({
    at: new Date(r.createdAt as Date).toISOString(),
    type: r.type,
    from: place(r.fromLocationId, r.fromBinId),
    to: place(r.toLocationId, r.toBinId),
    fromStatus: r.fromStatus ?? "",
    toStatus: r.toStatus ?? "",
    reference: r.reference ?? "",
    note: r.note ?? "",
    actor: r.actorName ?? "",
  }));
}

/** Put-away / re-shelve: move a piece to another bin in the same location. */
export async function moveItemToBin(actor: Actor, code: string, input: unknown): Promise<ItemView> {
  const { binId } = moveBinSchema.parse(input);
  const item = await lookupItem(actor, code);
  await assertBinAt(binId, item.location.id);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await transitionItem(
        actor,
        {
          code: item.code,
          expect: { status: ["available", "reserved", "damaged", "returned"], locationId: new Types.ObjectId(item.location.id) },
          set: { binId: binId ? new Types.ObjectId(binId) : null },
          movement: { type: "move_bin" },
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }
  return lookupItem(actor, code);
}
