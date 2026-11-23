import { describe, expect, it } from "vitest";
import { Invoice } from "@/models/Invoice";
import { Location } from "@/models/Location";
import { removeDemoSales, seedDemoSales } from "@/server/seed/demoSales";
import { salesOverview } from "@/server/services/analytics";
import { cancelInvoice } from "@/server/services/invoiceLifecycle";
import { createInvoice } from "@/server/services/invoices";
import { receiveStock } from "@/server/services/receiving";
import { createVendor } from "@/server/services/vendors";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function locId(code: string): Promise<string> {
  return String((await Location.findOne({ code }).lean())!._id);
}

async function twoStoresWithSales() {
  const owner = await actorWithRole("owner");
  const [sh1, sh2] = [await locId("SH1"), await locId("SH2")];
  const vendor = await createVendor(owner, { name: "Weaver" });
  const a = await receiveStock(owner, { vendorId: vendor.id, locationId: sh1, name: "Silk saree", category: "Saree", hsn: "5007", mrp: 10_000, costPrice: 6_000, quantity: 3 });
  const b = await receiveStock(owner, { vendorId: vendor.id, locationId: sh2, name: "Cotton saree", category: "Saree", hsn: "5208", mrp: 2_000, quantity: 2 });
  const priya = await actorWithRole("salesperson", { name: "Priya", locationIds: [sh1] });
  const arun = await actorWithRole("salesperson", { name: "Arun", locationIds: [sh2] });
  await createInvoice(priya, { locationId: sh1, lines: [{ code: a.codes[0] }, { code: a.codes[1] }], payment: { mode: "upi", reference: "U1" } });
  await createInvoice(arun, { locationId: sh2, lines: [{ code: b.codes[0] }], payment: { mode: "cash" } });
  return { owner, sh1, sh2, priya, arun, a, b };
}

describe("sales overview", () => {
  it("adds up sales by store, salesperson, product and payment mode", async () => {
    const { owner } = await twoStoresWithSales();
    const o = await salesOverview(owner, { range: "30d" });
    expect(o.kpis.revenue.value).toBe(2_200_000);
    expect(o.kpis.invoices.value).toBe(2);
    expect(o.kpis.pieces.value).toBe(3);
    expect(o.kpis.avgBill.value).toBe(1_100_000);
    expect(o.kpis.revenue.change).toBeNull();
    expect(o.byLocation.slice(0, 2).map((l) => [l.code, l.amount])).toEqual([["SH1", 2_000_000], ["SH2", 200_000]]);
    expect(o.byLocation.some((l) => l.code === "SH3" && l.amount === 0)).toBe(true);
    expect(o.byLocation.some((l) => l.type === "godown")).toBe(false);
    expect(o.bySalesperson.map((s) => s.name)).toEqual(["Priya", "Arun"]);
    expect(o.topProducts[0]).toMatchObject({ name: "Silk saree", pieces: 2, amount: 2_000_000 });
    expect(o.byPayment).toEqual([{ mode: "upi", amount: 2_000_000 }, { mode: "cash", amount: 200_000 }]);
    expect(o.daily).toHaveLength(30);
    expect(o.daily.at(-1)!.amount).toBe(2_200_000);
    expect(o.stock.available).toBe(2);
    expect(o.hasDemo).toBe(false);
  });

  it("shows margin only to roles allowed to see cost, and only for sales with a known cost", async () => {
    const { owner } = await twoStoresWithSales();
    const o = await salesOverview(owner, { range: "30d" });
    const silkTaxable = o.kpis.netSales - Math.round(200_000 / 1.05);
    expect(o.margin!.amount).toBe(silkTaxable - 2 * 600_000);
    expect(o.margin!.coveredPct).toBeGreaterThan(80);
    expect(o.margin!.coveredPct).toBeLessThan(100);

    const head = await actorWithRole("manager-head");
    expect((await salesOverview(head, { range: "30d" })).margin).toBeNull();
  });

  it("limits a store manager to their own store", async () => {
    const { sh1, sh2 } = await twoStoresWithSales();
    const manager = await actorWithRole("manager", { locationIds: [sh2] });
    const o = await salesOverview(manager, { range: "7d" });
    expect(o.kpis.revenue.value).toBe(200_000);
    expect(o.byLocation.map((l) => l.code)).toEqual(["SH2"]);
    await expect(salesOverview(manager, { range: "7d", locationId: sh1 })).rejects.toThrow("access");
  });

  it("filters to one store and leaves out cancelled and unpaid invoices", async () => {
    const { owner, sh1, priya, a } = await twoStoresWithSales();
    const open = await createInvoice(priya, { locationId: sh1, lines: [{ code: a.codes[2] }], payment: { mode: "razorpay" } });
    let o = await salesOverview(owner, { range: "30d", locationId: sh1 });
    expect(o.kpis.revenue.value).toBe(2_000_000);
    expect(o.pending).toEqual({ count: 1, amount: 1_000_000 });
    expect(o.stock.reserved).toBe(1);
    await cancelInvoice(owner, open.id, "Customer changed mind");
    o = await salesOverview(owner, { range: "30d", locationId: sh1 });
    expect(o.pending.count).toBe(0);
    expect(o.kpis.revenue.value).toBe(2_000_000);
  });

  it("compares with the previous period and forecasts from history", async () => {
    const { owner } = await twoStoresWithSales();
    const later = new Date(Date.now() + 10 * 86_400_000);
    const o = await salesOverview(owner, { range: "7d" }, later);
    expect(o.kpis.revenue.value).toBe(0);
    expect(o.kpis.revenue.previous).toBe(2_200_000);
    expect(o.kpis.revenue.change).toBe(-100);
    expect(o.forecast.days).toHaveLength(7);
    expect(o.forecast.basisDays).toBe(10);
    expect(o.forecast.total).toBe(Math.round(2_200_000 / 10) * 7);
    expect(o.forecast.confidence).toBe("low");
  });
});

describe("demo sales", () => {
  it("seeds 90 days of flagged sample sales once, and removes them cleanly", async () => {
    const now = new Date("2026-11-23T10:00:00Z");
    const first = await seedDemoSales(now);
    expect(first.created).toBeGreaterThan(800);
    expect(await seedDemoSales(now)).toEqual({ created: 0, skipped: true });
    expect(await Invoice.countDocuments({ number: { $not: /^DEMO-/ } })).toBe(0);
    const newest = await Invoice.findOne().sort({ createdAt: -1 }).lean();
    expect(newest!.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());

    const owner = await actorWithRole("owner");
    const o = await salesOverview(owner, { range: "90d" }, now);
    expect(o.hasDemo).toBe(true);
    expect(o.byLocation[0].code).toBe("SH1");
    expect(o.byChannel.map((c) => c.channel).sort()).toEqual(["instagram", "online", "store"]);
    expect(o.forecast.confidence).toBe("high");
    expect(o.forecast.total).toBeGreaterThan(0);
    expect(o.kpis.revenue.value).toBe(await Invoice.aggregate([{ $group: { _id: null, t: { $sum: "$totals.grandTotal" } } }]).then((r) => r[0].t));

    expect(await removeDemoSales()).toBe(first.created);
    expect((await salesOverview(owner, { range: "90d" }, now)).hasDemo).toBe(false);
  });
});

describe("demo logins", () => {
  it("creates one login per role with the right stores, once, and removes them", async () => {
    const { User } = await import("@/models/User");
    const { DEMO_USERS, demoEmail, removeDemoUsers, seedDemoUsers } = await import("@/server/seed/demoUsers");
    await expect(seedDemoUsers("short")).rejects.toThrow("at least 10");
    expect(await seedDemoUsers("a-long-demo-password")).toHaveLength(DEMO_USERS.length);
    expect(await seedDemoUsers("a-long-demo-password")).toHaveLength(0);
    const store = await User.findOne({ email: demoEmail("store") }).lean();
    expect(store!.locationIds.map(String)).toEqual([await locId("SH1")]);
    expect((await User.findOne({ email: demoEmail("owner") }).lean())!.locationIds).toHaveLength(0);
    expect(await removeDemoUsers()).toBe(DEMO_USERS.length);
  });
});
