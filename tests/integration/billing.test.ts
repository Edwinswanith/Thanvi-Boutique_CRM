import { describe, expect, it } from "vitest";
import { Invoice } from "@/models/Invoice";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { verifyWebhookSignature, parsePaidEvent } from "@/server/payments/razorpay";
import { createBinGrid } from "@/server/services/bins";
import { applyRazorpayPayment, cancelInvoice, getInvoice, listInvoices } from "@/server/services/invoiceLifecycle";
import { createInvoice, previewInvoice } from "@/server/services/invoices";
import { receiveStock } from "@/server/services/receiving";
import { getInvoiceSettings, listTaxRules, saveTaxRule, updateInvoiceSettings } from "@/server/services/taxSettings";
import { createVendor } from "@/server/services/vendors";
import { createHmac } from "node:crypto";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function storeWithStock() {
  const sh1 = await Location.findOneAndUpdate({ code: "SH1" }, { $set: { gstin: "33ABCDE1234F1Z5" } }, { returnDocument: "after" }).lean();
  const sh1Id = String(sh1!._id);
  const manager = await actorWithRole("manager", { locationIds: [sh1Id] });
  const sales = await actorWithRole("salesperson", { locationIds: [sh1Id] });
  const owner = await actorWithRole("owner");
  const vendor = await createVendor(owner, { name: "Weaver" });
  await createBinGrid(owner, { locationId: sh1Id, racks: 1, shelves: 1 });
  const silk = await receiveStock(owner, { vendorId: vendor.id, locationId: sh1Id, name: "Silk saree", category: "Saree", hsn: "5007", mrp: 10_500, quantity: 2 });
  const kurti = await receiveStock(owner, { vendorId: vendor.id, locationId: sh1Id, name: "Kurti", category: "Readymade", hsn: "6204", mrp: 3_000, quantity: 1 });
  return { sh1Id, manager, sales, owner, silk, kurti };
}

describe("billing", () => {
  it("bills scanned pieces with GST on the discounted value and marks them sold", async () => {
    const { sh1Id, sales, silk, kurti } = await storeWithStock();
    const body = {
      locationId: sh1Id,
      lines: [{ code: silk.codes[0], discount: { type: "percent", value: 10 } }, { code: kurti.codes[0], discount: { type: "flat", value: 500 } }],
      payment: { mode: "cash" },
    };
    const preview = await previewInvoice(sales, body);
    expect(preview.lines.map((l) => l.rate)).toEqual([5, 5]);
    const inv = await createInvoice(sales, body);
    expect(inv.number).toBe("SH1-00001");
    const saved = await getInvoice(sales, inv.id);
    expect(saved.status).toBe("closed");
    expect(saved.supplyType).toBe("intra");
    expect(saved.totals!.grandTotal).toBe(945_000 + 250_000);
    expect(saved.seller.gstin).toBe("33ABCDE1234F1Z5");
    expect(await Item.countDocuments({ code: { $in: [silk.codes[0], kurti.codes[0]] }, status: "sold" })).toBe(2);
    await expect(createInvoice(sales, body)).rejects.toThrow("sold");
  });

  it("uses IGST for an out-of-state B2B customer", async () => {
    const { sh1Id, sales, silk } = await storeWithStock();
    const inv = await createInvoice(sales, {
      locationId: sh1Id, lines: [{ code: silk.codes[1] }], payment: { mode: "upi", reference: "UPI123" },
      customer: { name: "Bengaluru Boutique", gstin: "29ABCDE1234F1Z5" },
    });
    const saved = await getInvoice(sales, inv.id);
    expect(saved.supplyType).toBe("inter");
    expect(saved.placeOfSupply).toBe("29");
    expect(saved.totals!.igst).toBeGreaterThan(0);
    expect(saved.totals!.cgst).toBe(0);
  });

  it("holds items for Razorpay, closes on a verified payment exactly once, and can cancel", async () => {
    const { sh1Id, sales, silk, kurti } = await storeWithStock();
    const inv = await createInvoice(sales, { locationId: sh1Id, lines: [{ code: silk.codes[0] }], payment: { mode: "razorpay" } });
    expect(inv.warning).toMatch(/Razorpay keys are not set/);
    expect((await Item.findOne({ code: silk.codes[0] }).lean())!.status).toBe("reserved");
    await Invoice.updateOne({ _id: inv.id }, { $set: { "razorpay.linkId": "plink_1" } });

    const event = { linkId: "plink_1", paymentId: "pay_1", amountPaise: 1_050_000 };
    expect(await applyRazorpayPayment(event)).toBe("applied");
    expect(await applyRazorpayPayment(event)).toBe("duplicate");
    expect(await applyRazorpayPayment({ ...event, linkId: "nope" })).toBe("unknown");
    expect((await getInvoice(sales, inv.id)).status).toBe("closed");
    expect((await Item.findOne({ code: silk.codes[0] }).lean())!.status).toBe("sold");

    const second = await createInvoice(sales, { locationId: sh1Id, lines: [{ code: kurti.codes[0] }], payment: { mode: "razorpay" } });
    await cancelInvoice(sales, second.id, "Customer left");
    expect((await Item.findOne({ code: kurti.codes[0] }).lean())!.status).toBe("available");
    await expect(cancelInvoice(sales, inv.id, "x")).rejects.toThrow("credit note");
    expect((await listInvoices(sales)).length).toBe(2);
    expect((await listInvoices(sales, { status: "cancelled" })).length).toBe(1);
  });

  it("refuses godown billing, other stores and duplicate lines", async () => {
    const { sh1Id, silk } = await storeWithStock();
    const gd1 = String((await Location.findOne({ code: "GD1" }).lean())!._id);
    const owner = await actorWithRole("owner");
    const otherStore = await actorWithRole("salesperson", { locationIds: [gd1] });
    await expect(createInvoice(owner, { locationId: gd1, lines: [{ code: silk.codes[0] }], payment: { mode: "cash" } })).rejects.toThrow("stores");
    await expect(createInvoice(otherStore, { locationId: sh1Id, lines: [{ code: silk.codes[0] }], payment: { mode: "cash" } })).rejects.toThrow("access");
    await expect(createInvoice(owner, { locationId: sh1Id, lines: [{ code: silk.codes[0] }, { code: silk.codes[0] }], payment: { mode: "cash" } })).rejects.toThrow("twice");
  });
});

describe("GST settings", () => {
  it("edits rules and invoice settings with validation", async () => {
    const owner = await actorWithRole("owner");
    const rules = await listTaxRules();
    expect(rules.map((r) => r.status)).toEqual(["draft", "draft"]);
    const approved = await saveTaxRule(owner, rules[0].id, { ...rules[0], slabs: [{ upTo: 2500, rate: 5 }, { upTo: null, rate: 18 }], status: "approved" });
    expect(approved.slabs[0].upTo).toBe(250_000);
    await expect(saveTaxRule(owner, null, { name: "Bad", hsnPrefixes: ["50"], slabs: [{ upTo: null, rate: 7 }] })).rejects.toThrow();
    await expect(saveTaxRule(owner, null, { name: "Bad", hsnPrefixes: ["50"], slabs: [{ upTo: 10, rate: 5 }] })).rejects.toThrow();
    const s = await getInvoiceSettings();
    const updated = await updateInvoiceSettings(owner, { ...s, legalName: "Thanvi Boutique Pvt Ltd", footer: "Visit again" });
    expect(updated.legalName).toBe("Thanvi Boutique Pvt Ltd");
  });
});

describe("Razorpay webhook helpers", () => {
  it("verifies signatures in constant time and parses paid events", () => {
    const body = JSON.stringify({ event: "payment_link.paid", payload: { payment_link: { entity: { id: "plink_9" } }, payment: { entity: { id: "pay_9", amount: 500 } } } });
    const sig = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "whsec")).toBe(true);
    expect(verifyWebhookSignature(body, sig, "other")).toBe(false);
    expect(verifyWebhookSignature(body, null, "whsec")).toBe(false);
    expect(verifyWebhookSignature(body, "short", "whsec")).toBe(false);
    expect(parsePaidEvent(JSON.parse(body))).toEqual({ linkId: "plink_9", paymentId: "pay_9", amountPaise: 500 });
    expect(parsePaidEvent({ event: "payment.failed" })).toBeNull();
  });
});
