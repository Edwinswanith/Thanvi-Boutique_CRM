import { Types } from "mongoose";
import { addDays, istDay, IST_OFFSET_MS, weekdayOf } from "@/lib/analytics/periods";
import { Invoice } from "@/models/Invoice";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { DEMO_INVOICE_PREFIX } from "@/server/services/analytics";

/**
 * SAMPLE sales history so the owner dashboard and forecast can be demonstrated
 * before real billing starts. Every invoice number starts with `DEMO-`, the lines
 * point at no real stock piece, and `removeDemoSales()` deletes them all.
 * Never run this against a database that is already live.
 */

const DAYS = 90;
const GST_RATE = 5;
const DEMO_COST_SHARE = 0.6;
/** Sunday … Saturday: weekends are busier. */
const WEEKDAY_FACTOR = [1.5, 0.8, 0.8, 0.9, 1, 1.2, 1.6];
const STORE_WEIGHT = [1.4, 1.1, 0.9, 0.7, 0.6];
const STAFF = [["Priya", "Karthik"], ["Meena", "Arun"], ["Lakshmi", "Vignesh"], ["Divya", "Suresh"], ["Anitha", "Ramesh"]];
const PAY_MODES = ["upi", "upi", "upi", "cash", "cash", "card"] as const;
const FALLBACK_PRODUCTS = [
  { sku: "DEMO-A", name: "Silk Saree", mrp: 345_000, hsn: "5007" },
  { sku: "DEMO-B", name: "Cotton Saree", mrp: 195_000, hsn: "5208" },
  { sku: "DEMO-C", name: "Linen Saree", mrp: 135_000, hsn: "5309" },
  { sku: "DEMO-D", name: "Tissue Saree", mrp: 253_000, hsn: "5407" },
];

interface DemoProduct { sku: string; name: string; mrp: number; hsn: string }
interface DemoLocation { _id: Types.ObjectId; code: string; name: string; type: string }

/** Small seeded generator so the demo data is the same on every run. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLine(p: DemoProduct, rand: () => number) {
  const discount = rand() < 0.25 ? Math.round((p.mrp * (rand() < 0.5 ? 0.05 : 0.1)) / 100) * 100 : 0;
  const price = p.mrp - discount;
  const taxable = Math.round((price * 100) / (100 + GST_RATE));
  const tax = price - taxable;
  const cgst = Math.floor(tax / 2);
  return { itemId: new Types.ObjectId(), code: `${p.sku}-DEMO`, sku: p.sku, name: p.name, hsn: p.hsn, mrp: p.mrp, discount, price, taxable, rate: GST_RATE, cgst, sgst: tax - cgst, igst: 0, total: price };
}

function buildInvoice(seq: number, loc: DemoLocation, staff: readonly string[], products: readonly DemoProduct[], at: Date, rand: () => number) {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const lines = Array.from({ length: rand() < 0.7 ? 1 : rand() < 0.8 ? 2 : 3 }, () => buildLine(pick(products), rand));
  const sum = (k: "mrp" | "discount" | "taxable" | "cgst" | "sgst" | "total") => lines.reduce((a, l) => a + l[k], 0);
  const grandTotal = sum("total");
  const online = loc.type === "online";
  return {
    number: `${DEMO_INVOICE_PREFIX}${String(seq).padStart(5, "0")}`,
    locationId: loc._id,
    channel: online ? (rand() < 0.7 ? "online" : "instagram") : "store",
    status: "closed",
    supplyType: "intra",
    placeOfSupply: "33",
    customer: { name: "", phone: "", gstin: "", address: "", stateCode: "" },
    lines,
    totals: { mrp: sum("mrp"), discount: sum("discount"), taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), igst: 0, roundOff: 0, grandTotal },
    taxBreakup: [{ rate: GST_RATE, taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), igst: 0 }],
    payments: [{ mode: online ? "razorpay" : pick(PAY_MODES), amount: grandTotal, reference: "DEMO", status: "captured", at }],
    seller: { tradeName: "Thanvi Boutique", storeName: loc.name, storeCode: loc.code, storeAddress: "", gstin: "", stateCode: "33", template: "classic" },
    salespersonId: null,
    salespersonName: online ? "Website" : pick(staff),
    createdAt: at,
    updatedAt: at,
  };
}

async function demoProducts(): Promise<DemoProduct[]> {
  await Product.updateMany({ sku: /^DEMO-/, costPrice: null }, [{ $set: { costPrice: { $round: [{ $multiply: ["$mrp", DEMO_COST_SHARE] }, 0] } } }], { updatePipeline: true });
  const found = await Product.find({ sku: /^DEMO-/ }).select("sku name mrp hsn").lean<DemoProduct[]>();
  return found.length ? found : FALLBACK_PRODUCTS;
}

export interface DemoSalesResult { created: number; skipped: boolean }

/** Idempotent: does nothing if demo invoices already exist. */
export async function seedDemoSales(now: Date = new Date()): Promise<DemoSalesResult> {
  if (await Invoice.exists({ number: { $regex: `^${DEMO_INVOICE_PREFIX}` } })) return { created: 0, skipped: true };
  const locations = await Location.find({ type: { $in: ["store", "online"] }, active: true }).sort({ type: -1, code: 1 }).lean<DemoLocation[]>();
  const products = await demoProducts();
  const rand = prng(20261123);
  const today = istDay(now);
  const docs: ReturnType<typeof buildInvoice>[] = [];

  for (let d = DAYS - 1; d >= 0; d -= 1) {
    const day = addDays(today, -d);
    const growth = 1 + 0.35 * ((DAYS - d) / DAYS);
    for (const [i, loc] of locations.entries()) {
      const expected = 4 * WEEKDAY_FACTOR[weekdayOf(day)] * (STORE_WEIGHT[i] ?? 0.6) * growth;
      const count = Math.max(0, Math.round(expected * (0.7 + rand() * 0.6)));
      for (let n = 0; n < count; n += 1) {
        const at = new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS + (10 + rand() * 11) * 3_600_000);
        if (at > now) continue;
        docs.push(buildInvoice(docs.length + 1, loc, STAFF[i % STAFF.length], products, at, rand));
      }
    }
  }
  await Invoice.insertMany(docs, { timestamps: false });
  return { created: docs.length, skipped: false };
}

export async function removeDemoSales(): Promise<number> {
  const res = await Invoice.deleteMany({ number: { $regex: `^${DEMO_INVOICE_PREFIX}` } });
  return res.deletedCount;
}
