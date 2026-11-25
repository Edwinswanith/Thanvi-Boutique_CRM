import mongoose, { Types, type ClientSession } from "mongoose";
import { z } from "zod";
import { AppError } from "@/lib/api";
import { codesSchema, transferRequestSchema } from "@/lib/validation/inventory";
import { Location } from "@/models/Location";
import { Transfer, type TransferStatus } from "@/models/Transfer";
import type { Actor } from "@/server/actor";
import { can, canAccessLocation } from "@/server/actor";
import { assertLocation, oid } from "@/server/scope";
import { writeAudit } from "./audit";
import { assertBinAt } from "./bins";
import { nextCode } from "./numberSeries";
import { transitionItem } from "./stockLedger";

export interface TransferView {
  id: string;
  ref: string;
  status: TransferStatus;
  from: { id: string; code: string; name: string };
  to: { id: string; code: string; name: string };
  lines: { sku: string; description: string; qty: number }[];
  items: { code: string; received: boolean }[];
  shortCodes: string[];
  excessCodes: string[];
  note: string;
  requestedBy: string;
  approvedBy: string;
  dispatchedBy: string;
  receivedBy: string;
  createdAt: string;
  dispatchedAt: string | null;
  receivedAt: string | null;
}

type TransferLean = Awaited<ReturnType<typeof loadRaw>>;
async function loadRaw(id: string, session?: ClientSession) {
  const t = await Transfer.findById(oid(id, "transfer")).session(session ?? null).lean();
  if (!t) throw new AppError("Transfer not found", 404);
  return t;
}

async function toViews(docs: TransferLean[]): Promise<TransferView[]> {
  const ids = docs.flatMap((d) => [d.fromLocationId, d.toLocationId]);
  const locs = new Map((await Location.find({ _id: { $in: ids } }, { code: 1, name: 1 }).lean()).map((l) => [String(l._id), l]));
  const loc = (id: unknown) => {
    const l = locs.get(String(id));
    return { id: String(id), code: l?.code ?? "?", name: l?.name ?? "?" };
  };
  const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
  return docs.map((d) => ({
    id: String(d._id),
    ref: d.ref,
    status: d.status,
    from: loc(d.fromLocationId),
    to: loc(d.toLocationId),
    lines: d.lines.map((l) => ({ sku: l.sku ?? "", description: l.description ?? "", qty: l.qty })),
    items: d.items.map((i) => ({ code: i.code, received: i.received })),
    shortCodes: d.shortCodes,
    excessCodes: d.excessCodes,
    note: d.note ?? "",
    requestedBy: d.requestedBy ?? "",
    approvedBy: d.approvedBy ?? "",
    dispatchedBy: d.dispatchedBy ?? "",
    receivedBy: d.receivedBy ?? "",
    createdAt: iso(d.createdAt as Date)!,
    dispatchedAt: iso(d.dispatchedAt),
    receivedAt: iso(d.receivedAt),
  }));
}

function visible(actor: Actor, t: { fromLocationId: unknown; toLocationId: unknown }): boolean {
  return canAccessLocation(actor, String(t.fromLocationId)) || canAccessLocation(actor, String(t.toLocationId));
}

export async function listTransfers(actor: Actor, status?: TransferStatus): Promise<TransferView[]> {
  const mine = actor.locationIds.map((id) => new Types.ObjectId(id));
  const scope = actor.role.allLocations ? {} : { $or: [{ fromLocationId: { $in: mine } }, { toLocationId: { $in: mine } }] };
  const docs = await Transfer.find({ ...scope, ...(status ? { status } : {}) }).sort({ createdAt: -1 }).limit(200).lean();
  return toViews(docs);
}

export async function getTransfer(actor: Actor, id: string): Promise<TransferView> {
  const t = await loadRaw(id);
  if (!visible(actor, t)) throw new AppError("Transfer not found", 404);
  return (await toViews([t]))[0];
}

/** A store asks a godown for stock (requested), or a godown pushes stock directly (approved). */
export async function createTransfer(actor: Actor, input: unknown): Promise<TransferView> {
  const data = transferRequestSchema.parse(input);
  if (data.fromLocationId === data.toLocationId) throw new AppError("Source and destination must differ", 422);
  assertLocation(actor, data.direct ? data.fromLocationId : data.toLocationId);
  const locations = await Location.find({ _id: { $in: [data.fromLocationId, data.toLocationId] }, active: true }, { type: 1 }).lean();
  const from = locations.find((location) => String(location._id) === data.fromLocationId);
  const to = locations.find((location) => String(location._id) === data.toLocationId);
  if (!from || !to) throw new AppError("Both locations must exist and be active", 422);
  if (data.direct && !can(actor, "transfers.edit")) throw new AppError("Sending stock requires dispatch access", 403);
  if (!data.direct && (from.type !== "godown" || to.type !== "store")) throw new AppError("Request stock for a shop from a godown", 422);
  if (!data.direct && data.lines.length === 0) throw new AppError("Add at least one line to the request", 422);

  const ref = await nextCode("transfer");
  const now = new Date();
  const doc = await Transfer.create({
    ref,
    fromLocationId: data.fromLocationId,
    toLocationId: data.toLocationId,
    lines: data.lines,
    note: data.note,
    status: data.direct ? "approved" : "requested",
    requestedBy: actor.name,
    ...(data.direct ? { approvedBy: actor.name, approvedAt: now } : {}),
  });
  await writeAudit(actor, { action: data.direct ? "transfer.create_direct" : "transfer.request", entity: "transfer", entityId: String(doc._id), reference: ref });
  return getTransfer(actor, String(doc._id));
}

async function setStatus(actor: Actor, id: string, from: TransferStatus[], patch: Record<string, unknown>, action: string) {
  const res = await Transfer.updateOne({ _id: oid(id, "transfer"), status: { $in: from } }, { $set: patch });
  if (res.matchedCount === 0) throw new AppError(`This transfer is no longer ${from.join(" or ")}`, 409);
  await writeAudit(actor, { action, entity: "transfer", entityId: id, after: patch });
}

export async function approveTransfer(actor: Actor, id: string): Promise<TransferView> {
  const t = await loadRaw(id);
  assertLocation(actor, String(t.fromLocationId));
  await setStatus(actor, id, ["requested"], { status: "approved", approvedBy: actor.name, approvedAt: new Date() }, "transfer.approve");
  return getTransfer(actor, id);
}

export async function cancelTransfer(actor: Actor, id: string): Promise<TransferView> {
  const t = await loadRaw(id);
  if (!visible(actor, t)) throw new AppError("Transfer not found", 404);
  await setStatus(actor, id, ["requested", "approved"], { status: "cancelled" }, "transfer.cancel");
  return getTransfer(actor, id);
}

/** Godown scans the pieces it sends: they leave the source and become in-transit to the destination. */
export async function dispatchTransfer(actor: Actor, id: string, input: unknown): Promise<TransferView> {
  const { codes } = codesSchema.parse(input);
  const t = await loadRaw(id);
  assertLocation(actor, String(t.fromLocationId));
  if (t.status !== "approved") throw new AppError("Only approved transfers can be dispatched", 409);
  const unique = [...new Set(codes)];
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const moved = [];
      for (const code of unique) {
        const item = await transitionItem(
          actor,
          {
            code,
            expect: { status: "available", locationId: t.fromLocationId },
            set: { status: "in_transit", locationId: t.toLocationId, binId: null, transferId: t._id },
            movement: { type: "dispatch", reference: t.ref },
          },
          session,
        );
        moved.push({ itemId: item._id, code, received: false });
      }
      const res = await Transfer.updateOne(
        { _id: t._id, status: "approved" },
        { $set: { status: "in_transit", items: moved, dispatchedBy: actor.name, dispatchedAt: new Date() } },
        { session },
      );
      if (res.matchedCount === 0) throw new AppError("Transfer changed while dispatching", 409);
      await writeAudit(actor, { action: "transfer.dispatch", entity: "transfer", entityId: id, reference: t.ref, after: { pieces: moved.length } }, session);
    });
  } finally {
    await session.endSession();
  }
  return getTransfer(actor, id);
}

const receiveInput = codesSchema
  .extend({ codes: z.array(z.string().trim().toUpperCase().min(1).max(40)).max(500).default([]), final: z.boolean().default(false) })
  .refine((v) => v.final || v.codes.length > 0, "Scan at least one piece");

/**
 * Store scans what arrived. Matching pieces become available (optionally into a bin).
 * Unknown codes are recorded as excess. With `final`, anything not scanned is recorded
 * as short and the transfer closes — shorts stay in transit for investigation.
 */
export async function receiveTransfer(actor: Actor, id: string, input: unknown): Promise<TransferView> {
  const { codes, binId, final } = receiveInput.parse(input);
  const scanned = [...new Set(codes)];
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const t = await loadRaw(id, session);
      assertLocation(actor, String(t.toLocationId));
      if (t.status !== "in_transit") throw new AppError("Only in-transit transfers can be received", 409);
      await assertBinAt(binId, String(t.toLocationId));
      const expected = new Set(t.items.map((item) => item.code));
      const received = new Set(t.items.filter((i) => i.received).map((i) => i.code));
      const excess = new Set(t.excessCodes);
      for (const code of scanned) {
        if (!expected.has(code)) {
          excess.add(code);
          continue;
        }
        if (received.has(code)) continue;
        await transitionItem(
          actor,
          {
            code,
            expect: { status: "in_transit", locationId: t.toLocationId },
            set: { status: "available", binId: binId ? new Types.ObjectId(binId) : null, transferId: null },
            movement: { type: "transfer_receive", reference: t.ref },
          },
          session,
        );
        received.add(code);
      }
      const items = t.items.map((i) => ({ itemId: i.itemId, code: i.code, received: received.has(i.code) }));
      const done = final || items.every((i) => i.received);
      const shortCodes = done ? items.filter((i) => !i.received).map((i) => i.code) : [];
      await Transfer.updateOne(
        { _id: t._id, status: "in_transit" },
        {
          $set: {
            items,
            excessCodes: [...excess],
            shortCodes,
            ...(done ? { status: "received", receivedBy: actor.name, receivedAt: new Date() } : {}),
          },
        },
        { session },
      );
      await writeAudit(actor, { action: done ? "transfer.receive" : "transfer.receive_partial", entity: "transfer", entityId: id, reference: t.ref, after: { received: received.size, short: shortCodes.length, excess: excess.size } }, session);
    });
  } finally {
    await session.endSession();
  }
  return getTransfer(actor, id);
}
