import mongoose, { type ClientSession, type Types } from "mongoose";
import { z } from "zod";
import { AppError } from "@/lib/api";
import { objectId } from "@/lib/validation/inventory";
import { Bin } from "@/models/Bin";
import { Item, type ItemStatus } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { StockCount, type StockCountDoc } from "@/models/StockCount";
import { can, type Actor } from "@/server/actor";
import { assertLocation, locationFilter, oid } from "@/server/scope";
import { writeAudit } from "./audit";
import { nextCode } from "./numberSeries";
import { transitionItem } from "./stockLedger";

const MAX_PIECES = 2_000;
const ON_HAND: ItemStatus[] = ["available", "reserved", "damaged", "returned"];
const startSchema = z.object({
  locationId: objectId,
  sku: z.string().trim().toUpperCase().max(40).default(""),
  binCode: z.string().trim().toUpperCase().max(20).default(""),
});
const scanSchema = z.object({
  codes: z.array(z.string().trim().toUpperCase().min(1).max(40)).max(MAX_PIECES),
  reason: z.string().trim().max(500).default(""),
  version: z.iso.datetime(),
  finish: z.boolean().default(false),
});

type Scope = { locationId: string | Types.ObjectId; sku: string; binId?: Types.ObjectId | null };
type Count = StockCountDoc & { _id: Types.ObjectId };
type PieceSnapshot = Pick<StockCountDoc["expected"][number], "code" | "status" | "updatedAt" | "missingFrom">;

function pieceScope(scope: Scope) {
  return { locationId: scope.locationId, ...(scope.sku ? { sku: scope.sku } : {}), ...(scope.binId ? { binId: scope.binId } : {}) };
}

async function expectedStock(scope: Scope, session?: ClientSession) {
  return Item.find({ ...pieceScope(scope), status: { $in: ON_HAND } })
    .select("code status updatedAt missingFrom").sort({ code: 1 }).limit(MAX_PIECES + 1).session(session ?? null).lean<PieceSnapshot[]>();
}

async function assertSnapshot(count: Count, session?: ClientSession) {
  const current = await expectedStock(count, session);
  const currentByCode = new Map(current.map((piece) => [piece.code, piece]));
  const changed = count.expected.some((piece) => {
    const now = currentByCode.get(piece.code);
    return !now || now.status !== piece.status || now.updatedAt.getTime() !== piece.updatedAt.getTime();
  });
  if (changed || current.length !== count.expected.length) throw new AppError("Stock moved since this count started. Start a new count for the latest stock.", 409);
}

function summary(count: Count) {
  return {
    id: String(count._id), reference: count.reference, locationId: String(count.locationId),
    locationName: count.locationName, sku: count.sku, binCode: count.binCode, status: count.status,
    createdAt: count.createdAt.toISOString(), expected: count.expected.length, scanned: count.scanned.length,
    differences: count.missing.length + count.found.length + count.unexpected.length,
  };
}

export async function listStockCounts(actor: Actor) {
  const counts = await StockCount.find(locationFilter(actor)).sort({ createdAt: -1 }).limit(100).lean();
  return counts.map(summary);
}

function findCount(actor: Actor, id: string) {
  return StockCount.findOne({ _id: oid(id, "stock count"), ...locationFilter(actor) });
}

export async function getStockCount(actor: Actor, id: string) {
  const count = await findCount(actor, id).lean();
  if (!count) throw new AppError("Stock count not found", 404);
  return {
    ...summary(count),
    scannedCodes: count.scanned, missingCodes: count.missing, foundCodes: count.found.map((piece) => piece.code),
    unexpectedCodes: count.unexpected, reason: count.reason, reviewedBy: count.reviewedBy,
    version: count.updatedAt.toISOString(), isCreator: String(count.createdBy) === actor.id,
  };
}

export async function startStockCount(actor: Actor, input: unknown) {
  const data = startSchema.parse(input);
  assertLocation(actor, data.locationId);
  const [location, product, bin] = await Promise.all([
    Location.findOne({ _id: data.locationId, active: true }, { name: 1 }).lean(),
    data.sku ? Product.exists({ sku: data.sku }) : null,
    data.binCode ? Bin.findOne({ locationId: data.locationId, code: data.binCode }, { _id: 1 }).lean() : null,
  ]);
  if (!location) throw new AppError("Choose an active location", 422);
  if (data.sku && !product) throw new AppError("SKU not found", 422);
  if (data.binCode && !bin) throw new AppError("Bin not found at this location", 422);
  const scope = { locationId: location._id, sku: data.sku, binId: bin?._id ?? null };
  const expected = await expectedStock(scope);
  if (expected.length > MAX_PIECES) throw new AppError("Choose a SKU or bin to count up to 2,000 pieces at a time", 422);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const reference = await nextCode("stockCount", session);
      const [count] = await StockCount.create([{
        ...scope, reference, locationName: location.name, binCode: data.binCode, expected, createdBy: actor.id,
      }], { session });
      await writeAudit(actor, { action: "stock_count.start", entity: "stock_count", entityId: String(count._id), reference }, session);
      return summary(count);
    });
  } finally {
    await session.endSession();
  }
}

function assertEditCount(actor: Actor, count: Count) {
  if (String(count.createdBy) !== actor.id && !can(actor, "counts.approve")) throw new AppError("Ask the counter or a manager to update this count", 403);
}

export async function saveStockCount(actor: Actor, id: string, input: unknown) {
  const data = scanSchema.parse(input);
  const count = await findCount(actor, id).lean();
  if (!count) throw new AppError("Stock count not found", 404);
  assertEditCount(actor, count);
  if (count.status !== "open" || count.updatedAt.toISOString() !== data.version) throw new AppError("This count changed. Reopen it and continue.", 409);
  const scanned = [...new Set(data.codes)];
  const patch: Partial<Pick<StockCountDoc, "scanned" | "reason" | "missing" | "unexpected" | "status">> & { found?: PieceSnapshot[] } = { scanned, reason: data.reason };

  if (data.finish) {
    await assertSnapshot(count);
    const expected = new Set(count.expected.map((piece) => piece.code));
    const present = new Set(scanned);
    const extra = scanned.filter((code) => !expected.has(code));
    const found = await Item.find({ ...pieceScope(count), code: { $in: extra }, status: "missing", missingFrom: { $in: ON_HAND.filter((status) => status !== "reserved") } })
      .select("code status updatedAt missingFrom").lean<PieceSnapshot[]>();
    const foundCodes = new Set(found.map((piece) => piece.code));
    patch.missing = count.expected.filter((piece) => !present.has(piece.code)).map((piece) => piece.code);
    patch.found = found;
    patch.unexpected = extra.filter((code) => !foundCodes.has(code));
    const hasDifferences = patch.missing.length + foundCodes.size + patch.unexpected.length > 0;
    if (hasDifferences && !data.reason) throw new AppError("Add a reason or observation for the differences", 422);
    patch.status = hasDifferences ? "review" : "completed";
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await StockCount.updateOne({ _id: count._id, status: "open", updatedAt: count.updatedAt }, { $set: patch }, { session });
      if (!updated.matchedCount) throw new AppError("This count changed. Reopen it and continue.", 409);
      if (data.finish) await writeAudit(actor, { action: "stock_count.submit", entity: "stock_count", entityId: id, reference: count.reference, after: { status: patch.status, scanned: scanned.length, missing: patch.missing, unexpected: patch.unexpected } }, session);
    });
  } finally {
    await session.endSession();
  }
  return getStockCount(actor, id);
}

export async function approveStockCount(actor: Actor, id: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const count = await findCount(actor, id).session(session).lean();
      if (!count) throw new AppError("Stock count not found", 404);
      if (count.status !== "review") throw new AppError("Only counts awaiting review can be approved", 409);
      await assertSnapshot(count, session);
      const missing = new Set(count.missing);
      const lost = count.expected.filter((piece) => missing.has(piece.code));
      if (lost.some((piece) => piece.status === "reserved")) {
        throw new AppError("Resolve the hold on missing reserved pieces before starting a new count.", 409);
      }
      const movement = { type: "adjustment" as const, reference: count.reference, note: count.reason };
      for (const piece of [...lost, ...count.found]) {
        const restoring = piece.status === "missing";
        const status = restoring ? piece.missingFrom : "missing";
        if (!status) throw new AppError("This piece has no previous status to restore", 409);
        await transitionItem(actor, {
          code: piece.code,
          expect: { status: piece.status, locationId: count.locationId, updatedAt: piece.updatedAt },
          set: { status, missingFrom: restoring ? null : piece.status },
          movement,
        }, session);
      }
      await StockCount.updateOne({ _id: count._id, status: "review" }, { $set: { status: "completed", reviewedBy: actor.name } }, { session });
      await writeAudit(actor, { action: "stock_count.approve", entity: "stock_count", entityId: id, reference: count.reference, after: { missing: count.missing, found: count.found.map((piece) => piece.code) } }, session);
    });
  } finally {
    await session.endSession();
  }
}

export async function cancelStockCount(actor: Actor, id: string) {
  const count = await findCount(actor, id).lean();
  if (!count) throw new AppError("Stock count not found", 404);
  assertEditCount(actor, count);
  const updated = await StockCount.updateOne({ _id: count._id, status: { $in: ["open", "review"] } }, { $set: { status: "cancelled" } });
  if (!updated.matchedCount) throw new AppError("This count is already closed", 409);
  await writeAudit(actor, { action: "stock_count.cancel", entity: "stock_count", entityId: id, reference: count.reference });
}
