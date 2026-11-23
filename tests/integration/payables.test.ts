import { describe, expect, it } from "vitest";
import { Location } from "@/models/Location";
import { VendorBill } from "@/models/VendorBill";
import { can } from "@/server/actor";
import { removeDemoPayables, seedDemoPayables } from "@/server/seed/demoPayables";
import { getBill, listBills, payablesSummary, recordPayment, updateBill, vendorDues } from "@/server/services/payables";
import { receiveStock } from "@/server/services/receiving";
import { createVendor } from "@/server/services/vendors";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function setup() {
  const owner = await actorWithRole("owner");
  const gd1 = String((await Location.findOne({ code: "GD1" }).lean())!._id);
  const weaver = await createVendor(owner, { name: "Kanchi Weavers" });
  const mill = await createVendor(owner, { name: "Salem Mills" });
  const receive = (vendorId: string, costPrice: number | null, quantity: number) =>
    receiveStock(owner, { vendorId, locationId: gd1, name: "Silk saree", category: "Saree", hsn: "5007", mrp: 9_000, costPrice, quantity });
  return { owner, gd1, weaver, mill, receive };
}

describe("vendor bills", () => {
  it("raises a bill for every delivery: cost price × pieces, due in 30 days", async () => {
    const { owner, weaver, receive } = await setup();
    const r = await receive(weaver.id, 5_000, 4);
    const [bill] = await listBills(owner);
    expect(bill).toMatchObject({ number: "VB-00001", vendorName: "Kanchi Weavers", receiptRef: r.receiptRef, sku: r.sku, quantity: 4, unitCost: 500_000, amount: 2_000_000, paid: 0, pending: 2_000_000, status: "unpaid" });
    const days = (Date.parse(bill.dueDate) - Date.parse(bill.billDate)) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it("keeps a delivery without a cost price as 'amount needed' until someone fills it in", async () => {
    const { owner, weaver, receive } = await setup();
    await receive(weaver.id, null, 3);
    const [draft] = await listBills(owner);
    expect(draft.status).toBe("draft");
    await expect(recordPayment(owner, draft.id, { amount: 100, mode: "cash" })).rejects.toThrow("amount");
    const updated = await updateBill(owner, draft.id, { amount: 12_000, vendorInvoiceNo: "kw/118" });
    expect(updated).toMatchObject({ amount: 1_200_000, status: "unpaid", vendorInvoiceNo: "KW/118", unitCost: 400_000 });
  });

  it("takes part payments, then closes the bill, and never lets it be overpaid", async () => {
    const { owner, weaver, receive } = await setup();
    await receive(weaver.id, 5_000, 2);
    const [bill] = await listBills(owner);
    let b = await recordPayment(owner, bill.id, { amount: 4_000, mode: "upi", reference: "UTR1" });
    expect(b).toMatchObject({ paid: 400_000, pending: 600_000, status: "partial" });
    await expect(recordPayment(owner, bill.id, { amount: 6_000.01, mode: "bank" })).rejects.toThrow("more than");
    await expect(updateBill(owner, bill.id, { amount: 20_000 })).rejects.toThrow("payment");
    b = await recordPayment(owner, bill.id, { amount: 6_000, mode: "bank", reference: "NEFT9", note: "Final" });
    expect(b).toMatchObject({ paid: 1_000_000, pending: 0, status: "paid" });
    await expect(recordPayment(owner, bill.id, { amount: 1, mode: "cash" })).rejects.toThrow("more than");
    const full = await getBill(owner, bill.id);
    expect(full.payments.map((p) => [p.amount, p.mode, p.reference])).toEqual([[600_000, "bank", "NEFT9"], [400_000, "upi", "UTR1"]]);
    expect(full.payments[0].recordedBy).toBe(owner.name);
  });

  it("rejects two payments racing past the bill amount", async () => {
    const { owner, weaver, receive } = await setup();
    await receive(weaver.id, 1_000, 1);
    const [bill] = await listBills(owner);
    const results = await Promise.allSettled([1, 2, 3].map(() => recordPayment(owner, bill.id, { amount: 600, mode: "cash" })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getBill(owner, bill.id)).paid).toBe(60_000);
  });

  it("refuses future payment dates and unknown bills", async () => {
    const { owner, weaver, receive } = await setup();
    await receive(weaver.id, 1_000, 1);
    const [bill] = await listBills(owner);
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString();
    await expect(recordPayment(owner, bill.id, { amount: 10, mode: "cash", paidAt: tomorrow })).rejects.toThrow("future");
    await expect(getBill(owner, "0".repeat(24))).rejects.toThrow("not found");
  });
});

describe("vendor dues", () => {
  it("shows billed, paid, pending and overdue per vendor and overall", async () => {
    const { owner, weaver, mill, receive } = await setup();
    await receive(weaver.id, 5_000, 2);
    await receive(weaver.id, 2_000, 1);
    await receive(mill.id, 1_000, 3);
    const bills = await listBills(owner);
    const first = bills.find((b) => b.amount === 1_000_000)!;
    await recordPayment(owner, first.id, { amount: 2_500, mode: "upi" });
    await VendorBill.updateOne({ _id: bills.find((b) => b.amount === 200_000)!.id }, { $set: { dueDate: new Date(Date.now() - 5 * 86_400_000) } });

    const dues = await vendorDues(owner);
    expect(dues.map((d) => [d.vendorName, d.billed, d.paid, d.pending, d.overdue, d.openBills])).toEqual([
      ["Kanchi Weavers", 1_200_000, 250_000, 950_000, 200_000, 2],
      ["Salem Mills", 300_000, 0, 300_000, 0, 1],
    ]);
    const s = await payablesSummary(owner);
    expect(s).toMatchObject({ pending: 1_250_000, overdue: 200_000, overdueBills: 1, paidLast30: 250_000, openBills: 3, drafts: 0 });
    expect(s.topVendors[0]).toMatchObject({ vendorName: "Kanchi Weavers", pending: 950_000 });

    expect((await listBills(owner, { status: "overdue" })).map((b) => b.amount)).toEqual([200_000]);
    expect(await listBills(owner, { vendorId: mill.id })).toHaveLength(1);
    expect(await listBills(owner, { status: "paid" })).toHaveLength(0);
  });

  it("is for the owner by default: not managers, godown staff or the Super Admin", async () => {
    expect(can(await actorWithRole("owner"), "payables.view")).toBe(true);
    expect(can(await actorWithRole("owner"), "payables.create")).toBe(true);
    for (const slug of ["manager-head", "manager", "godown-staff", "salesperson", "super-admin"]) {
      expect(can(await actorWithRole(slug), "payables.view")).toBe(false);
    }
  });

  it("seeds flagged demo vendors and bills once and removes them", async () => {
    const owner = await actorWithRole("owner");
    const first = await seedDemoPayables(new Date());
    expect(first.bills).toBeGreaterThan(8);
    expect((await seedDemoPayables(new Date())).skipped).toBe(true);
    const s = await payablesSummary(owner);
    expect(s.pending).toBeGreaterThan(0);
    expect(s.overdue).toBeGreaterThan(0);
    expect(s.paidLast30).toBeGreaterThan(0);
    expect(s.hasDemo).toBe(true);
    expect(await removeDemoPayables()).toBe(first.bills);
    expect((await payablesSummary(owner)).pending).toBe(0);
  });
});
