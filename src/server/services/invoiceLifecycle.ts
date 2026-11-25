import mongoose, { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { Invoice, type InvoiceStatus } from "@/models/Invoice";
import { Location } from "@/models/Location";
import type { Actor } from "@/server/actor";
import type { PaidEvent } from "@/server/payments/razorpay";
import { locationFilter, oid } from "@/server/scope";
import { writeAudit } from "./audit";
import { transitionItem } from "./stockLedger";

/** Used for ledger rows written by the payment webhook (no human actor). */
export const WEBHOOK_ACTOR: Actor = {
  id: "000000000000000000000000",
  name: "Razorpay webhook",
  email: "",
  role: { id: "", name: "system", permissions: [], isSystem: false, confidential: false, allLocations: true },
  locationIds: [],
};

export interface InvoiceRow {
  id: string;
  number: string;
  createdAt: string;
  status: InvoiceStatus;
  channel: string;
  store: string;
  customer: string;
  pieces: number;
  grandTotal: number;
  modes: string[];
}

function invoiceScope(actor: Actor) {
  return { ...locationFilter(actor), ...(actor.role.slug === "salesperson" ? { salespersonId: actor.id } : {}) };
}

export async function listInvoices(actor: Actor, opts: { status?: InvoiceStatus; q?: string } = {}): Promise<InvoiceRow[]> {
  const filter: Record<string, unknown> = invoiceScope(actor);
  if (opts.status) filter.status = opts.status;
  if (opts.q?.trim()) filter.$or = [{ number: opts.q.trim().toUpperCase() }, { "customer.phone": opts.q.trim() }];
  const docs = await Invoice.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  const locs = new Map((await Location.find({}, { code: 1 }).lean()).map((l) => [String(l._id), l.code]));
  return docs.map((d) => ({
    id: String(d._id),
    number: d.number,
    createdAt: new Date(d.createdAt as Date).toISOString(),
    status: d.status,
    channel: d.channel,
    store: locs.get(String(d.locationId)) ?? "?",
    customer: d.customer?.name || d.customer?.phone || "Walk-in",
    pieces: d.lines.length,
    grandTotal: d.totals?.grandTotal ?? 0,
    modes: d.payments.map((p) => p.mode),
  }));
}

export async function getInvoice(actor: Actor, id: string) {
  const doc = await Invoice.findOne({ _id: oid(id, "invoice"), ...invoiceScope(actor) }).lean();
  if (!doc) throw new AppError("Invoice not found", 404);
  return { ...doc, id: String(doc._id) };
}

/** Releases held items. Only open (unpaid) invoices can be cancelled; paid ones need a credit note. */
export async function cancelInvoice(actor: Actor, id: string, reason: string): Promise<void> {
  const inv = await getInvoice(actor, id);
  if (inv.status !== "open") throw new AppError("Only unpaid (open) invoices can be cancelled. Paid invoices need a credit note.", 409);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const res = await Invoice.updateOne({ _id: inv._id, status: "open" }, { $set: { status: "cancelled", cancelReason: reason.slice(0, 300) } }, { session });
      if (res.matchedCount === 0) throw new AppError("Invoice changed meanwhile", 409);
      for (const line of inv.lines) {
        await transitionItem(actor, { code: line.code!, expect: { status: "reserved" }, set: { status: "available", invoiceId: null }, movement: { type: "release", reference: inv.number, note: reason } }, session);
      }
      await writeAudit(actor, { action: "invoice.cancel", entity: "invoice", entityId: id, reference: inv.number, after: { reason } }, session);
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Called only from the signature-verified Razorpay webhook. Idempotent: a repeated
 * delivery of the same payment id is a no-op. Reserved items become sold; invoice closes.
 */
export async function applyRazorpayPayment(event: PaidEvent): Promise<"applied" | "duplicate" | "unknown"> {
  const inv = await Invoice.findOne({ "razorpay.linkId": event.linkId }).lean();
  if (!inv) return "unknown";
  if (inv.payments.some((p) => p.reference === event.paymentId)) return "duplicate";
  if (event.amountPaise < (inv.totals?.grandTotal ?? 0)) throw new AppError("Paid amount is less than the invoice total", 409);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const res = await Invoice.updateOne(
        { _id: inv._id, status: "open", "payments.reference": { $ne: event.paymentId } },
        { $set: { status: "closed" }, $push: { payments: { mode: "razorpay", amount: event.amountPaise, reference: event.paymentId, status: "captured" } } },
        { session },
      );
      if (res.matchedCount === 0) return;
      for (const line of inv.lines) {
        await transitionItem(WEBHOOK_ACTOR, { code: line.code!, expect: { status: "reserved" }, set: { status: "sold", binId: null }, movement: { type: "sale", reference: inv.number } }, session);
      }
      await writeAudit(WEBHOOK_ACTOR, { action: "invoice.paid", entity: "invoice", entityId: String(inv._id), reference: inv.number, after: { paymentId: event.paymentId } }, session);
    });
  } finally {
    await session.endSession();
  }
  return "applied";
}

export function isObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
