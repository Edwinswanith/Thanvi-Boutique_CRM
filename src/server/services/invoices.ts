import mongoose, { Types } from "mongoose";
import { AppError } from "@/lib/api";
import { calculateInvoice, stateFromGstin, supplyTypeFor, type Discount, type InvoiceCalc } from "@/lib/gst/engine";
import { toPaise } from "@/lib/money";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/lib/validation/billing";
import { Invoice, type InvoiceStatus } from "@/models/Invoice";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import type { Actor } from "@/server/actor";
import { createPaymentLink, razorpayConfigured } from "@/server/payments/razorpay";
import { assertLocation } from "@/server/scope";
import { writeAudit } from "./audit";
import { nextCode } from "./numberSeries";
import { transitionItem } from "./stockLedger";
import { activeTaxRules, getInvoiceSettings, type InvoiceSettingsView } from "./taxSettings";

export type SellerSnapshot = Omit<InvoiceSettingsView, "pricesIncludeTax" | "roundToRupee"> & {
  storeName: string;
  storeCode: string;
  storeAddress: string;
};

/** Discounts arrive in rupees for flat values; the engine works in paise. */
const toEngineDiscount = (d: CreateInvoiceInput["billDiscount"]): Discount | null =>
  !d ? null : d.type === "flat" ? { type: "flat", value: toPaise(d.value) } : d;

interface Prepared {
  location: { _id: Types.ObjectId; code: string; name: string; address?: string | null; city?: string | null; gstin?: string | null };
  items: { _id: Types.ObjectId; code: string; sku: string; name: string; hsn: string }[];
  calc: InvoiceCalc;
  seller: SellerSnapshot;
  supplyType: "intra" | "inter";
  placeOfSupply: string;
}

/** Validates everything and computes the bill without writing anything (also powers the POS preview). */
export async function prepareInvoice(actor: Actor, data: CreateInvoiceInput): Promise<Prepared> {
  assertLocation(actor, data.locationId);
  const location = await Location.findOne({ _id: data.locationId, active: true }).lean();
  if (!location || location.type === "godown") throw new AppError("Billing is only available at stores and online channels", 422);

  const codes = data.lines.map((l) => l.code);
  if (new Set(codes).size !== codes.length) throw new AppError("The same piece is on the bill twice", 422);
  const items = await Item.find({ code: { $in: codes } }).lean();
  const byCode = new Map(items.map((i) => [i.code, i]));
  for (const code of codes) {
    const it = byCode.get(code);
    if (!it) throw new AppError(`No piece with code ${code}`, 404);
    if (String(it.locationId) !== String(location._id)) throw new AppError(`${code} is not in stock at ${location.name}`, 409);
    if (it.status !== "available") throw new AppError(`${code} is ${it.status.replace("_", " ")} and can't be billed`, 409);
  }
  const products = new Map(
    (await Product.find({ _id: { $in: items.map((i) => i.productId) } }).lean()).map((p) => [String(p._id), p]),
  );
  const [settings, rules] = await Promise.all([getInvoiceSettings(), activeTaxRules()]);
  const sellerGstin = location.gstin || settings.gstin;
  const sellerState = stateFromGstin(sellerGstin) ?? settings.stateCode;
  const buyerState = data.customer.stateCode || stateFromGstin(data.customer.gstin) || sellerState;
  const supplyType = supplyTypeFor(sellerState, buyerState);

  const lines = data.lines.map((l) => {
    const p = products.get(String(byCode.get(l.code)!.productId))!;
    return { key: l.code, hsn: p.hsn, mrp: p.mrp, discount: toEngineDiscount(l.discount) };
  });
  const calc = calculateInvoice(lines, rules, {
    pricesIncludeTax: settings.pricesIncludeTax,
    roundToRupee: settings.roundToRupee,
    supplyType,
    billDiscount: toEngineDiscount(data.billDiscount),
  });
  const { pricesIncludeTax: _a, roundToRupee: _b, ...rest } = settings;
  void _a;
  void _b;
  return {
    location,
    items: codes.map((code) => {
      const it = byCode.get(code)!;
      const p = products.get(String(it.productId))!;
      return { _id: it._id, code, sku: it.sku, name: p.name, hsn: p.hsn };
    }),
    calc,
    seller: {
      ...rest,
      gstin: sellerGstin,
      stateCode: sellerState,
      storeName: location.name,
      storeCode: location.code,
      storeAddress: [location.address, location.city].filter(Boolean).join(", "),
    },
    supplyType,
    placeOfSupply: buyerState,
  };
}

export async function previewInvoice(actor: Actor, input: unknown): Promise<InvoiceCalc & { supplyType: string }> {
  const prepared = await prepareInvoice(actor, createInvoiceSchema.parse(input));
  return { ...prepared.calc, supplyType: prepared.supplyType };
}

/**
 * Issues the invoice. Cash/UPI/card: items → sold and the invoice closes at once.
 * Razorpay: items → reserved and the invoice stays open until the signed webhook confirms payment.
 */
export async function createInvoice(actor: Actor, input: unknown): Promise<{ id: string; number: string; paymentUrl: string | null; warning: string | null }> {
  const data = createInvoiceSchema.parse(input);
  const p = await prepareInvoice(actor, data);
  const online = data.payment.mode === "razorpay";
  const invoiceId = new Types.ObjectId();
  let number = "";

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      number = await nextCode(`invoice:${p.location.code}`, session);
      for (const it of p.items) {
        await transitionItem(
          actor,
          {
            code: it.code,
            expect: { status: "available", locationId: p.location._id },
            set: { status: online ? "reserved" : "sold", invoiceId, binId: online ? undefined : null },
            movement: { type: online ? "reserve" : "sale", reference: number },
          },
          session,
        );
      }
      await Invoice.create([buildInvoiceDoc(invoiceId, number, data, p, actor, online)], { session });
      await writeAudit(actor, { action: "invoice.create", entity: "invoice", entityId: String(invoiceId), reference: number, after: { total: p.calc.totals.grandTotal, mode: data.payment.mode } }, session);
    });
  } finally {
    await session.endSession();
  }
  return { id: String(invoiceId), number, ...(online ? await attachPaymentLink(invoiceId, number, p, data) : { paymentUrl: null, warning: null }) };
}

function buildInvoiceDoc(id: Types.ObjectId, number: string, data: CreateInvoiceInput, p: Prepared, actor: Actor, online: boolean) {
  const lineByCode = new Map(p.calc.lines.map((l) => [l.key, l]));
  return {
    _id: id,
    number,
    locationId: p.location._id,
    channel: data.channel,
    status: (online ? "open" : "closed") as InvoiceStatus,
    supplyType: p.supplyType,
    placeOfSupply: p.placeOfSupply,
    customer: data.customer,
    lines: p.items.map((it) => {
      const l = lineByCode.get(it.code)!;
      return { itemId: it._id, code: it.code, sku: it.sku, name: it.name, hsn: it.hsn, mrp: l.mrp, discount: l.discount, price: l.price, taxable: l.taxable, rate: l.rate, cgst: l.cgst, sgst: l.sgst, igst: l.igst, total: l.total };
    }),
    totals: p.calc.totals,
    taxBreakup: p.calc.taxBreakup,
    payments: online ? [] : [{ mode: data.payment.mode, amount: p.calc.totals.grandTotal, reference: data.payment.reference, status: "captured" as const }],
    seller: p.seller,
    salespersonId: actor.id,
    salespersonName: actor.name,
  };
}

async function attachPaymentLink(id: Types.ObjectId, number: string, p: Prepared, data: CreateInvoiceInput) {
  if (!razorpayConfigured()) return { paymentUrl: null, warning: "Razorpay keys are not set, so no payment link was created. The invoice is open with the items on hold." };
  try {
    const link = await createPaymentLink({ amountPaise: p.calc.totals.grandTotal, invoiceNumber: number, description: `${p.seller.tradeName} invoice ${number}`, customer: data.customer });
    await Invoice.updateOne({ _id: id }, { $set: { razorpay: { linkId: link.id, shortUrl: link.shortUrl } } });
    return { paymentUrl: link.shortUrl, warning: null };
  } catch (err) {
    return { paymentUrl: null, warning: err instanceof Error ? err.message : "Payment link failed" };
  }
}
