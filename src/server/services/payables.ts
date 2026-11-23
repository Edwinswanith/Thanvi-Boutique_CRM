import mongoose, { Types, type ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import { toPaise } from "@/lib/money";
import { billStatusFor, DEFAULT_CREDIT_DAYS, type BillStatus, type VendorPaymentMode } from "@/lib/payables";
import { billQuerySchema, billUpdateSchema, vendorPaymentSchema, type BillFilter } from "@/lib/validation/payables";
import { Vendor } from "@/models/Vendor";
import { VendorBill } from "@/models/VendorBill";
import { VendorPayment } from "@/models/VendorPayment";
import type { Actor } from "@/server/actor";
import { locationFilter, oid } from "@/server/scope";
import { writeAudit } from "./audit";
import { nextCode } from "./numberSeries";

const DAY_MS = 86_400_000;
const OPEN: BillStatus[] = ["unpaid", "partial"];

export interface BillView {
  id: string;
  number: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  receiptRef: string;
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
  amount: number;
  paid: number;
  pending: number;
  status: BillStatus;
  overdue: boolean;
  vendorInvoiceNo: string;
  billDate: string;
  dueDate: string;
}

export interface PaymentView { id: string; amount: number; mode: VendorPaymentMode; reference: string; note: string; paidAt: string; recordedBy: string }
export interface BillDetail extends BillView { payments: PaymentView[] }
export interface VendorDue { vendorId: string; vendorName: string; vendorCode: string; billed: number; paid: number; pending: number; overdue: number; openBills: number }
export interface PayablesSummary {
  pending: number;
  overdue: number;
  overdueBills: number;
  openBills: number;
  drafts: number;
  paidLast30: number;
  topVendors: VendorDue[];
  hasDemo: boolean;
}

interface BillLean {
  _id: Types.ObjectId; number: string; vendorId: Types.ObjectId; receiptRef: string; sku: string; description: string; quantity: number;
  amount: number; paidAmount: number; status: BillStatus; vendorInvoiceNo: string; billDate: Date; dueDate: Date;
}
type VendorNames = Map<string, { name: string; code: string }>;

async function vendorNames(ids: readonly Types.ObjectId[]): Promise<VendorNames> {
  const vendors = await Vendor.find({ _id: { $in: ids } }).select("name code").lean();
  return new Map(vendors.map((v) => [String(v._id), { name: v.name, code: v.code }]));
}

function toView(b: BillLean, vendors: VendorNames, now = Date.now()): BillView {
  const pending = Math.max(0, b.amount - b.paidAmount);
  return {
    id: String(b._id),
    number: b.number,
    vendorId: String(b.vendorId),
    vendorName: vendors.get(String(b.vendorId))?.name ?? "Unknown vendor",
    vendorCode: vendors.get(String(b.vendorId))?.code ?? "",
    receiptRef: b.receiptRef,
    sku: b.sku,
    description: b.description,
    quantity: b.quantity,
    unitCost: Math.round(b.amount / b.quantity),
    amount: b.amount,
    paid: b.paidAmount,
    pending,
    status: b.status,
    overdue: pending > 0 && b.dueDate.getTime() < now,
    vendorInvoiceNo: b.vendorInvoiceNo,
    billDate: b.billDate.toISOString(),
    dueDate: b.dueDate.toISOString(),
  };
}

interface ReceiptBill { vendorId: string; locationId: string; receiptRef: string; productId: Types.ObjectId; sku: string; description: string; quantity: number; unitCost: number | null }

/** Called inside the goods-receipt transaction: every delivery becomes a bill (or a draft when no cost was entered). */
export async function createBillForReceipt(actor: Actor, r: ReceiptBill, session: ClientSession): Promise<string> {
  const number = await nextCode("vendorBill", session);
  const amount = r.unitCost === null ? 0 : r.unitCost * r.quantity;
  const billDate = new Date();
  await VendorBill.create(
    [{ ...r, number, amount, paidAmount: 0, status: billStatusFor(amount, 0), billDate, dueDate: new Date(billDate.getTime() + DEFAULT_CREDIT_DAYS * DAY_MS), createdBy: actor.id }],
    { session },
  );
  return number;
}

function statusFilter(status: BillFilter | undefined): Record<string, unknown> {
  if (!status) return {};
  if (status === "open") return { status: { $in: OPEN } };
  if (status === "overdue") return { status: { $in: OPEN }, dueDate: { $lt: new Date() } };
  return { status };
}

export async function listBills(actor: Actor, input: unknown = {}): Promise<BillView[]> {
  const q = billQuerySchema.parse(input);
  const filter = { ...locationFilter(actor), ...statusFilter(q.status), ...(q.vendorId ? { vendorId: oid(q.vendorId, "vendor") } : {}) };
  const bills = await VendorBill.find(filter).sort({ billDate: -1, _id: -1 }).limit(500).lean<BillLean[]>();
  const vendors = await vendorNames(bills.map((b) => b.vendorId));
  return bills.map((b) => toView(b, vendors));
}

async function loadBill(actor: Actor, id: string): Promise<BillLean> {
  const bill = await VendorBill.findOne({ _id: oid(id, "bill"), ...locationFilter(actor) }).lean<BillLean>();
  if (!bill) throw new AppError("Vendor bill not found", 404);
  return bill;
}

export async function getBill(actor: Actor, id: string): Promise<BillDetail> {
  const bill = await loadBill(actor, id);
  const [vendors, payments] = await Promise.all([
    vendorNames([bill.vendorId]),
    VendorPayment.find({ billId: bill._id }).sort({ paidAt: -1, _id: -1 }).lean(),
  ]);
  return {
    ...toView(bill, vendors),
    payments: payments.map((p) => ({ id: String(p._id), amount: p.amount, mode: p.mode, reference: p.reference, note: p.note, paidAt: p.paidAt.toISOString(), recordedBy: p.recordedBy })),
  };
}

/** Records a payment to the vendor. The bill can never be paid beyond its amount, even with two people paying at once. */
export async function recordPayment(actor: Actor, billId: string, input: unknown): Promise<BillDetail> {
  const data = vendorPaymentSchema.parse(input);
  const bill = await loadBill(actor, billId);
  if (bill.status === "draft") throw new AppError("Enter the bill amount before recording a payment", 409);
  const amount = toPaise(data.amount);
  const paidTotal = { $add: ["$paidAmount", amount] };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const res = await VendorBill.updateOne(
        { _id: bill._id, $expr: { $lte: [paidTotal, "$amount"] } },
        [{ $set: { paidAmount: paidTotal } }, { $set: { status: { $cond: [{ $gte: ["$paidAmount", "$amount"] }, "paid", "partial"] } } }],
        { session, updatePipeline: true },
      );
      if (res.matchedCount === 0) throw new AppError("This is more than what is still owed on the bill", 409);
      await VendorPayment.create(
        [{ billId: bill._id, vendorId: bill.vendorId, amount, mode: data.mode, reference: data.reference, note: data.note, paidAt: data.paidAt ?? new Date(), recordedById: actor.id, recordedBy: actor.name }],
        { session },
      );
      await writeAudit(actor, { action: "vendorBill.pay", entity: "vendorBill", entityId: String(bill._id), reference: bill.number, after: { amount, mode: data.mode, reference: data.reference } }, session);
    });
  } finally {
    await session.endSession();
  }
  return getBill(actor, billId);
}

/** Edits the vendor's invoice number, due date or (only before any payment) the amount. */
export async function updateBill(actor: Actor, billId: string, input: unknown): Promise<BillDetail> {
  const data = billUpdateSchema.parse(input);
  const bill = await loadBill(actor, billId);
  const set: Record<string, unknown> = {};
  if (data.vendorInvoiceNo !== undefined) set.vendorInvoiceNo = data.vendorInvoiceNo.toUpperCase();
  if (data.dueDate) set.dueDate = data.dueDate;
  if (data.amount !== undefined) {
    if (bill.paidAmount > 0) throw new AppError("The amount can't be changed after a payment has been recorded", 409);
    set.amount = toPaise(data.amount);
    set.status = billStatusFor(toPaise(data.amount), 0);
  }
  const res = await VendorBill.updateOne({ _id: bill._id, paidAmount: bill.paidAmount }, { $set: set });
  if (res.matchedCount === 0) throw new AppError("This bill just changed. Refresh and try again.", 409);
  await writeAudit(actor, { action: "vendorBill.update", entity: "vendorBill", entityId: String(bill._id), reference: bill.number, before: { amount: bill.amount, dueDate: bill.dueDate, vendorInvoiceNo: bill.vendorInvoiceNo }, after: set });
  return getBill(actor, billId);
}

interface DueGroup { _id: Types.ObjectId; billed: number; paid: number; overdue: number; openBills: number }

/** Per-vendor totals, biggest pending first. Vendors with nothing billed are left out. */
export async function vendorDues(actor: Actor): Promise<VendorDue[]> {
  const pendingExpr = { $subtract: ["$amount", "$paidAmount"] };
  const isOpen = { $in: ["$status", OPEN] };
  const groups = await VendorBill.aggregate<DueGroup>([
    { $match: { ...locationFilter(actor), status: { $ne: "draft" } } },
    {
      $group: {
        _id: "$vendorId",
        billed: { $sum: "$amount" },
        paid: { $sum: "$paidAmount" },
        overdue: { $sum: { $cond: [{ $and: [isOpen, { $lt: ["$dueDate", new Date()] }] }, pendingExpr, 0] } },
        openBills: { $sum: { $cond: [isOpen, 1, 0] } },
      },
    },
  ]);
  const vendors = await vendorNames(groups.map((g) => g._id));
  return groups
    .map((g) => ({
      vendorId: String(g._id),
      vendorName: vendors.get(String(g._id))?.name ?? "Unknown vendor",
      vendorCode: vendors.get(String(g._id))?.code ?? "",
      billed: g.billed, paid: g.paid, pending: g.billed - g.paid, overdue: g.overdue, openBills: g.openBills,
    }))
    .sort((a, b) => b.pending - a.pending || a.vendorName.localeCompare(b.vendorName));
}

export async function payablesSummary(actor: Actor): Promise<PayablesSummary> {
  const scope = locationFilter(actor);
  const since = new Date(Date.now() - 30 * DAY_MS);
  const billIds = actor.role.allLocations ? null : await VendorBill.find(scope).distinct("_id");
  const [dues, drafts, overdueBills, paid, hasDemo] = await Promise.all([
    vendorDues(actor),
    VendorBill.countDocuments({ ...scope, status: "draft" }),
    VendorBill.countDocuments({ ...scope, status: { $in: OPEN }, dueDate: { $lt: new Date() } }),
    VendorPayment.aggregate<{ total: number }>([{ $match: { paidAt: { $gte: since }, ...(billIds ? { billId: { $in: billIds } } : {}) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    VendorBill.exists({ ...scope, demo: true }),
  ]);
  const sum = (k: "pending" | "overdue" | "openBills") => dues.reduce((a, d) => a + d[k], 0);
  return {
    pending: sum("pending"),
    overdue: sum("overdue"),
    overdueBills,
    openBills: sum("openBills"),
    drafts,
    paidLast30: paid[0]?.total ?? 0,
    topVendors: dues.filter((d) => d.pending > 0).slice(0, 4),
    hasDemo: Boolean(hasDemo),
  };
}
