import { Types } from "mongoose";
import { billStatusFor } from "@/lib/payables";
import { Location } from "@/models/Location";
import { Vendor } from "@/models/Vendor";
import { VendorBill } from "@/models/VendorBill";
import { VendorPayment } from "@/models/VendorPayment";

/**
 * SAMPLE vendors, bills and payments so the vendor-dues screens can be demonstrated.
 * Everything is flagged (`demo: true`, vendor codes `DEMOV…`) and removed by `removeDemoPayables()`.
 */

const DAY_MS = 86_400_000;
const VENDORS = [
  { code: "DEMOV1", name: "Kanchipuram Silk Weavers (demo)", contactName: "Sundaram", phone: "" },
  { code: "DEMOV2", name: "Chettinad Cotton House (demo)", contactName: "Valli", phone: "" },
  { code: "DEMOV3", name: "Banaras Tissue Traders (demo)", contactName: "Imran", phone: "" },
];
/** [vendor index, days ago, description, pieces, unit cost ₹, share already paid] */
const BILLS: Array<[number, number, string, number, number, number]> = [
  [0, 84, "Kanchipuram silk sarees", 20, 4200, 1], [0, 61, "Pochampally pattu sarees", 15, 2100, 1],
  [0, 43, "Mulberry silk sarees", 24, 1950, 0.5], [0, 12, "Matka silk sarees", 10, 5600, 0],
  [1, 75, "Handloom cotton sarees", 40, 1150, 1], [1, 48, "Kota cotton sarees", 36, 700, 1],
  [1, 38, "Linen sarees", 30, 820, 0], [1, 9, "Mashru cotton silk sarees", 18, 1900, 0.3],
  [2, 66, "Tissue sarees", 25, 1500, 1], [2, 35, "Organza sarees", 16, 1400, 0.6],
  [2, 5, "Metallic tissue sarees", 12, 5200, 0],
];

export interface DemoPayablesResult { bills: number; skipped: boolean }

export async function seedDemoPayables(now: Date = new Date()): Promise<DemoPayablesResult> {
  if (await VendorBill.exists({ demo: true })) return { bills: 0, skipped: true };
  const godown = await Location.findOne({ type: "godown", active: true }).sort({ code: 1 }).lean();
  if (!godown) throw new Error("No godown found: run npm run seed first");
  const vendorIds: Types.ObjectId[] = [];
  for (const v of VENDORS) {
    const doc = await Vendor.findOneAndUpdate({ code: v.code }, { $setOnInsert: v }, { upsert: true, returnDocument: "after" });
    vendorIds.push(doc!._id);
  }
  const bills = BILLS.map(([v, daysAgo, description, quantity, cost, paidShare], i) => {
    const amount = quantity * cost * 100;
    const paidAmount = Math.round(amount * paidShare);
    const billDate = new Date(now.getTime() - daysAgo * DAY_MS);
    return {
      _id: new Types.ObjectId(), number: `DEMO-VB-${String(i + 1).padStart(3, "0")}`, vendorId: vendorIds[v], locationId: godown._id,
      receiptRef: `DEMO-GRN-${i + 1}`, description, quantity, amount, paidAmount, status: billStatusFor(amount, paidAmount),
      vendorInvoiceNo: `INV-${2000 + i * 7}`, billDate, dueDate: new Date(billDate.getTime() + 30 * DAY_MS), demo: true,
    };
  });
  await VendorBill.insertMany(bills);
  await VendorPayment.insertMany(
    bills.filter((b) => b.paidAmount > 0).map((b, i) => ({
      billId: b._id, vendorId: b.vendorId, amount: b.paidAmount, mode: i % 3 === 0 ? "upi" : "bank", reference: `DEMO-UTR-${i + 1}`,
      paidAt: new Date(Math.min(now.getTime() - DAY_MS, b.billDate.getTime() + 21 * DAY_MS)), recordedBy: "Demo", demo: true,
    })),
  );
  return { bills: bills.length, skipped: false };
}

export async function removeDemoPayables(): Promise<number> {
  await VendorPayment.deleteMany({ demo: true });
  const res = await VendorBill.deleteMany({ demo: true });
  await Vendor.deleteMany({ code: { $in: VENDORS.map((v) => v.code) } });
  return res.deletedCount;
}
