import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Vendor } from "@/models/Vendor";
import { WebListing } from "@/models/WebListing";
import { cancelTestOrder, placeTestOrder } from "@/server/services/shopCheckout";
import { salesOverview } from "@/server/services/analytics";
import { createInvoice } from "@/server/services/invoices";
import { quoteShopOrder } from "@/server/services/shopPricing";
import { getPublishedBySlug } from "@/server/services/storefront";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function stock() {
  const web = await Location.findOne({ code: "WEB" }).orFail();
  const godown = await Location.findOne({ code: "GD1" }).orFail();
  const vendor = await Vendor.create({ code: "QA-VENDOR", name: "QA vendor" });
  const product = await Product.create({ sku: "QA", name: "QA Saree", category: "Saree", hsn: "5007", mrp: 105000, vendorId: vendor.id });
  await WebListing.create({ productId: product.id, slug: "qa-saree", title: "QA Saree", status: "published" });
  await Item.create([
    { code: "QA-001", productId: product.id, sku: "QA", vendorId: vendor.id, locationId: web.id },
    { code: "QA-002", productId: product.id, sku: "QA", vendorId: vendor.id, locationId: godown.id },
  ]);
}

function request(paymentMethod: "dummy" | "cod" = "dummy") {
  return {
    requestId: randomUUID(), paymentMethod,
    customer: { name: "QA customer", email: "qa@example.test", phone: "9000000000", address: "1 Test Street", city: "Chennai", state: "Tamil Nadu", postalCode: "600001" },
    lines: [{ slug: "qa-saree", quantity: 1, unitPrice: 105000 }],
  };
}

it.each([["dummy", "test_paid"], ["cod", "pending"]] as const)("saves a %s order and consumes exactly one WEB piece", async (method, status) => {
  await stock();
  const input = request(method);
  const placed = await placeTestOrder(input);
  expect(placed).toMatchObject({ total: 105000, paymentStatus: status });
  expect(await placeTestOrder(input)).toEqual(placed);
  expect(await Order.countDocuments()).toBe(1);
  expect(await Order.findById(input.requestId).lean()).toMatchObject({ test: true, customer: input.customer, paymentMethod: method });
  expect(await Item.findOne({ code: "QA-001" }).lean()).toMatchObject({ status: "sold", orderId: input.requestId });
  expect(await Item.findOne({ code: "QA-002" }).lean()).toMatchObject({ status: "available" });
  expect(await StockMovement.countDocuments({ reference: placed.orderNumber, type: "sale" })).toBe(1);
  expect(await getPublishedBySlug("qa-saree")).toMatchObject({ availableQuantity: 0 });
  await expect(placeTestOrder({ ...input, customer: { ...input.customer, name: "Another name" } })).rejects.toMatchObject({ status: 409 });
});

it("rejects stale prices, unavailable quantities and partial orders", async () => {
  await stock();
  const input = request();
  await expect(placeTestOrder({ ...input, lines: [{ ...input.lines[0], unitPrice: 1 }] })).rejects.toMatchObject({ status: 409 });
  await expect(placeTestOrder({ ...input, lines: [{ ...input.lines[0], quantity: 2 }] })).rejects.toMatchObject({ status: 409 });
  await expect(placeTestOrder({ ...input, lines: [...input.lines, { slug: "missing", quantity: 1, unitPrice: 1 }] })).rejects.toMatchObject({ status: 409 });
  expect(await Order.countDocuments()).toBe(0);
  expect(await StockMovement.countDocuments({ type: "sale" })).toBe(0);
  expect(await Item.countDocuments({ status: "available" })).toBe(2);
});

it("allows only one of two shoppers to buy the final WEB piece", async () => {
  await stock();
  const results = await Promise.allSettled([placeTestOrder(request()), placeTestOrder(request("cod"))]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
  expect(await Order.countDocuments()).toBe(1);
  expect(await StockMovement.countDocuments({ type: "sale" })).toBe(1);
});

it.each(["cod", "dummy"] as const)("cancels a %s test order and returns the exact pieces once", async (method) => {
  await stock();
  const input = request(method);
  const placed = await placeTestOrder(input);
  const owner = await actorWithRole("owner");
  const shopManager = await actorWithRole("manager");
  await expect(cancelTestOrder(shopManager, input.requestId)).rejects.toMatchObject({ status: 404 });
  await Promise.all([cancelTestOrder(owner, input.requestId), cancelTestOrder(owner, input.requestId)]);
  expect(await Order.findById(input.requestId).lean()).toMatchObject({ status: "cancelled", cancelledAt: expect.any(Date) });
  expect(await Item.findOne({ code: "QA-001" }).lean()).toMatchObject({ status: "available", orderId: null });
  expect(await StockMovement.countDocuments({ reference: placed.orderNumber, type: "release" })).toBe(1);
  expect(await getPublishedBySlug("qa-saree")).toMatchObject({ availableQuantity: 1 });
  await expect(placeTestOrder(input)).rejects.toMatchObject({ status: 409 });
  await expect(placeTestOrder(request(method))).resolves.toMatchObject({ total: 105000 });
});

it("quotes shipping and GST, freezes the invoice and keeps test amounts out of revenue", async () => {
  await stock();
  const owner = await actorWithRole("owner");
  vi.stubEnv("SHOP_TEST_SHIPPING_PAISE", "10000");
  vi.stubEnv("SHOP_TEST_SHIPPING_GST_RATE", "10");
  try {
    const input = request("cod");
    const local = await quoteShopOrder(input);
    expect(local).toMatchObject({ shipping: 10000, igst: 0, total: 116000 });
    expect(local.cgst + local.sgst).toBe(6000);
    const interstate = await quoteShopOrder({ ...input, customer: { ...input.customer, state: "Karnataka" } });
    expect(interstate).toMatchObject({ shipping: 10000, cgst: 0, sgst: 0, igst: 6000, total: 116000 });
    await expect(placeTestOrder({ ...input, expectedTotal: 105000 })).rejects.toMatchObject({ status: 409 });
    expect(await Item.countDocuments({ status: "sold" })).toBe(0);
    const placed = await placeTestOrder({ ...input, expectedTotal: local.total });
    expect(placed).toMatchObject({ breakdown: local, invoiceUrl: expect.stringContaining("?token=") });
    vi.stubEnv("SHOP_TEST_SHIPPING_PAISE", "20000");
    expect(await placeTestOrder({ ...input, expectedTotal: local.total })).toEqual(placed);
    expect(await Order.findById(input.requestId).lean()).toMatchObject({ breakdown: local, lines: [{ hsn: "5007", gstRate: 5, taxable: 100000 }] });
    const dashboard = await salesOverview(owner, { range: "7d" });
    expect(dashboard.kpis.revenue.value).toBe(0);
    expect(dashboard.websiteOrders).toMatchObject({ cod: { count: 1, amount: 116000 }, invoiced: { count: 0, amount: 0 } });
    const shop = await Location.findOne({ code: "SH1" }).orFail();
    expect((await salesOverview(owner, { range: "7d", locationId: shop.id })).websiteOrders?.cod.count).toBe(0);
    await cancelTestOrder(owner, input.requestId);
    expect((await salesOverview(owner, { range: "7d" })).websiteOrders).toMatchObject({ cancelled: 1, cod: { count: 0, amount: 0 } });
    const web = await Location.findOne({ code: "WEB" }).orFail();
    await createInvoice(owner, { locationId: web.id, channel: "online", lines: [{ code: "QA-001" }], payment: { mode: "cash" } });
    expect((await salesOverview(owner, { range: "7d", locationId: web.id })).websiteOrders?.invoiced).toEqual({ count: 1, amount: 105000 });
  } finally {
    vi.unstubAllEnvs();
  }
});
