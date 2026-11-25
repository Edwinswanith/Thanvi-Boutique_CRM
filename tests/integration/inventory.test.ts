import { describe, expect, it } from "vitest";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { WebListing } from "@/models/WebListing";
import { StockMovement } from "@/models/StockMovement";
import type { Actor } from "@/server/actor";
import { createBin, createBinGrid, listBins } from "@/server/services/bins";
import { itemHistory, lookupItem, moveItemToBin } from "@/server/services/items";
import { receiveStock } from "@/server/services/receiving";
import { listProducts, stockSummary } from "@/server/services/stock";
import { approveStockCount, getStockCount, saveStockCount, startStockCount } from "@/server/services/stockCounts";
import { getPublishedBySlug } from "@/server/services/storefront";
import {
  approveTransfer,
  cancelTransfer,
  createTransfer,
  dispatchTransfer,
  getTransfer,
  listTransfers,
  receiveTransfer,
} from "@/server/services/transfers";
import { createVendor, listVendors } from "@/server/services/vendors";
import { actorWithRole, setupTestDb } from "../setup/db";

setupTestDb();

async function locId(code: string): Promise<string> {
  return String((await Location.findOne({ code }).lean())!._id);
}

export async function scenario() {
  const owner = await actorWithRole("owner");
  const gd1 = await locId("GD1");
  const sh1 = await locId("SH1");
  const godown = await actorWithRole("godown-staff", { locationIds: [gd1] });
  const manager = await actorWithRole("manager", { locationIds: [sh1] });
  const vendor = await createVendor(godown, { name: "Kanchi Weavers" });
  await createBinGrid(godown, { locationId: gd1, racks: 2, shelves: 2 });
  const bins = await listBins(godown, gd1);
  const receipt = await receiveStock(owner, {
    vendorId: vendor.id, locationId: gd1, binId: bins[0].id, name: "Kanchipuram silk", category: "Silk saree",
    hsn: "5007", mrp: 10_500, costPrice: 6_200, quantity: 3, color: "Peacock blue",
  });
  return { owner, godown, manager, vendor, gd1, sh1, bins, receipt };
}

describe("receiving", () => {
  it("creates a SKU, one coded piece per unit, ledger rows and a GRN", async () => {
    const { receipt, vendor, bins } = await scenario();
    expect(vendor.code).toBe("XY1");
    expect(receipt.sku).toBe("TB1000");
    expect(receipt.codes).toEqual(["TB1000-001", "TB1000-002", "TB1000-003"]);
    expect(receipt.receiptRef).toBe("GRN-00001");
    expect(await Item.countDocuments({ status: "available", binId: bins[0].id })).toBe(3);
    expect(await StockMovement.countDocuments({ type: "receive" })).toBe(3);
    expect((await listVendors()).length).toBe(1);
  });

  it("rejects receiving at someone else's location or into a foreign bin", async () => {
    const { owner, manager, godown, vendor, gd1, sh1, bins } = await scenario();
    const base = { vendorId: vendor.id, name: "X saree", category: "Saree", hsn: "5208", mrp: 900, quantity: 1 };
    await expect(receiveStock(manager, { ...base, locationId: gd1 })).rejects.toThrow("access");
    await expect(receiveStock(owner, { ...base, locationId: sh1, binId: bins[0].id })).rejects.toThrow("bin");
    await expect(receiveStock(manager, { ...base, locationId: sh1 })).rejects.toThrow("designated receiving godown");
    await expect(receiveStock(godown, { ...base, locationId: gd1, costPrice: 400 })).rejects.toThrow("confidential");
    await expect(receiveStock(manager, { ...base, locationId: sh1, hsn: "12" })).rejects.toThrow();
  });

  it("restocks an existing listing with consecutive barcodes across concurrent receipts", async () => {
    const { receipt, vendor, gd1, owner } = await scenario();
    await WebListing.create({ productId: receipt.productId, slug: "restock-silk", title: "Restock silk", status: "published" });
    const input = { existingSku: "tb1000", vendorId: vendor.id, locationId: gd1, quantity: 2, costPrice: 6500 };
    const restocks = await Promise.all([receiveStock(owner, input), receiveStock(owner, input)]);
    expect(restocks.every((result) => result.productId === receipt.productId && result.sku === receipt.sku)).toBe(true);
    expect(restocks.flatMap((result) => result.codes).sort()).toEqual(["TB1000-004", "TB1000-005", "TB1000-006", "TB1000-007"]);
    expect(await Product.countDocuments()).toBe(1);
    expect(await WebListing.countDocuments({ productId: receipt.productId, status: "published" })).toBe(1);
    await expect(receiveStock(owner, { ...input, existingSku: "UNKNOWN" })).rejects.toMatchObject({ status: 404 });
    const web = await locId("WEB");
    const transfer = await createTransfer(owner, { fromLocationId: gd1, toLocationId: web, direct: true });
    await dispatchTransfer(owner, transfer.id, { codes: ["TB1000-004"] });
    expect(await getPublishedBySlug("restock-silk")).toMatchObject({ availableQuantity: 0 });
    await receiveTransfer(owner, transfer.id, { codes: ["TB1000-004"] });
    expect(await getPublishedBySlug("restock-silk")).toMatchObject({ availableQuantity: 1, price: 1_050_000 });
  });
});

describe("stock counts", () => {
  it("posts missing and found pieces once with the original barcode and scope", async () => {
    const { owner, godown, manager, gd1, receipt } = await scenario();
    const [first, second, third] = receipt.codes;
    const count = await startStockCount(godown, { locationId: gd1, sku: receipt.sku });
    await expect(getStockCount(manager, count.id)).rejects.toThrow("not found");
    const draft = await getStockCount(godown, count.id);
    const submitted = await saveStockCount(godown, count.id, { version: draft.version, codes: [first, first, second], finish: true, reason: "Missing on shelf" });
    expect(submitted).toMatchObject({ status: "review", missingCodes: [third], scanned: 2 });
    expect(await Item.countDocuments({ locationId: gd1, status: "available" })).toBe(3);
    await approveStockCount(owner, count.id);
    await expect(approveStockCount(owner, count.id)).rejects.toThrow("awaiting review");
    expect(await Item.countDocuments({ locationId: gd1, status: "available" })).toBe(2);

    const recount = await startStockCount(godown, { locationId: gd1 });
    const saved = await saveStockCount(godown, recount.id, {
      version: (await getStockCount(godown, recount.id)).version, codes: receipt.codes,
      finish: true, reason: "Original piece found",
    });
    expect(saved.foundCodes).toEqual([third]);
    await approveStockCount(owner, recount.id);
    expect(await Item.countDocuments({ locationId: gd1, status: "available" })).toBe(3);
    expect(await StockMovement.countDocuments({ code: third, type: "adjustment" })).toBe(2);
  });

  it("stops approval when stock moved during review", async () => {
    const { owner, godown, gd1, sh1, receipt } = await scenario();
    const count = await startStockCount(godown, { locationId: gd1 });
    await saveStockCount(godown, count.id, {
      version: (await getStockCount(godown, count.id)).version, codes: receipt.codes.slice(0, 2),
      finish: true, reason: "One piece missing",
    });
    const transfer = await createTransfer(godown, { fromLocationId: gd1, toLocationId: sh1, direct: true });
    await dispatchTransfer(godown, transfer.id, { codes: [receipt.codes[2]] });
    await expect(approveStockCount(owner, count.id)).rejects.toThrow("Stock moved");
    expect(await StockMovement.countDocuments({ type: "adjustment" })).toBe(0);
  });
});

describe("scan lookup", () => {
  it("shows where a piece is, hides cost from non-confidential roles, and blocks other stores", async () => {
    const { owner, godown, manager, bins } = await scenario();
    const asOwner = await lookupItem(owner, "tb1000-002");
    expect(asOwner.location.code).toBe("GD1");
    expect(asOwner.bin?.code).toBe(bins[0].code);
    expect(asOwner.costPrice).toBe(620_000);
    expect((await lookupItem(godown, "TB1000-002")).costPrice).toBeNull();
    await expect(lookupItem(manager, "TB1000-002")).rejects.toThrow("outside your locations");
    await expect(lookupItem(owner, "NOPE-1")).rejects.toThrow("No piece");
  });

  it("re-shelves a piece and records it in the history", async () => {
    const { godown, bins } = await scenario();
    const moved = await moveItemToBin(godown, "TB1000-001", { binId: bins[3].id });
    expect(moved.bin?.code).toBe(bins[3].code);
    const history = await itemHistory(godown, "TB1000-001");
    expect(history.map((h) => h.type)).toEqual(["receive", "move_bin"]);
    expect(history[1].to).toContain(bins[3].code);
  });

  it("manages bins and lists products with counts", async () => {
    const { godown, owner, gd1 } = await scenario();
    const extra = await createBin(godown, { locationId: gd1, code: "cut-1", zone: "Cutting" });
    expect(extra.code).toBe("CUT-1");
    await expect(createBin(godown, { locationId: gd1, code: "CUT-1" })).rejects.toThrow();
    expect((await createBinGrid(godown, { locationId: gd1, racks: 2, shelves: 2 })).created).toBe(0);
    const [product] = await listProducts(owner, "kanchi");
    expect(product).toMatchObject({ sku: "TB1000", available: 3, total: 3, costPrice: 620_000 });
    expect((await listProducts(godown))[0].costPrice).toBeNull();
  });
});

describe("stock request → dispatch → receive", () => {
  it("keeps both batches when two receiving sessions scan different pieces", async () => {
    const { godown, manager, gd1, sh1, receipt } = await scenario();
    const transfer = await createTransfer(godown, { fromLocationId: gd1, toLocationId: sh1, direct: true });
    const [first, second] = receipt.codes;
    await dispatchTransfer(godown, transfer.id, { codes: [first, second] });
    await Promise.all([
      receiveTransfer(manager, transfer.id, { codes: [first] }),
      receiveTransfer(manager, transfer.id, { codes: [second] }),
    ]);
    const completed = await getTransfer(manager, transfer.id);
    expect(completed.status).toBe("received");
    expect(completed.items.every((piece) => piece.received)).toBe(true);
    expect(await Item.countDocuments({ locationId: sh1, status: "available" })).toBe(2);
  });

  it("moves stock exactly and records short and excess pieces", async () => {
    const { godown, manager, owner, gd1, sh1 } = await scenario();
    const req = await createTransfer(manager, { fromLocationId: gd1, toLocationId: sh1, lines: [{ sku: "TB1000", qty: 2 }] });
    expect(req.status).toBe("requested");
    expect(req.ref).toBe("TR-00001");
    await expect(dispatchTransfer(godown, req.id, { codes: ["TB1000-001"] })).rejects.toThrow("approved");
    await expect(approveTransfer(manager, req.id)).rejects.toThrow("access");
    await approveTransfer(godown, req.id);

    const sent = await dispatchTransfer(godown, req.id, { codes: ["TB1000-001", "TB1000-002"] });
    expect(sent.status).toBe("in_transit");
    const summary = await stockSummary(owner);
    const row = (code: string) => summary.find((r) => r.code === code)!;
    expect(row("GD1").counts.available).toBe(1);
    expect(row("SH1").counts.in_transit).toBe(2);

    const sh1Bin = await createBin(manager, { locationId: sh1, code: "DISPLAY-1" });
    const partial = await receiveTransfer(manager, req.id, { codes: ["TB1000-001"], binId: sh1Bin.id });
    expect(partial.status).toBe("in_transit");
    const done = await receiveTransfer(manager, req.id, { codes: ["ZZ-999"], final: true });
    expect(done.status).toBe("received");
    expect(done.shortCodes).toEqual(["TB1000-002"]);
    expect(done.excessCodes).toEqual(["ZZ-999"]);
    expect((await lookupItem(manager, "TB1000-001")).bin?.code).toBe("DISPLAY-1");
    expect((await itemHistory(manager, "TB1000-001")).map((h) => h.type)).toEqual(["receive", "dispatch", "transfer_receive"]);
  });

  it("never dispatches the same piece twice and supports direct transfers and cancel", async () => {
    const { godown, manager, gd1, sh1 } = await scenario();
    const a = await createTransfer(godown, { fromLocationId: gd1, toLocationId: sh1, direct: true });
    const b = await createTransfer(godown, { fromLocationId: gd1, toLocationId: sh1, direct: true });
    expect(a.status).toBe("approved");
    await dispatchTransfer(godown, a.id, { codes: ["TB1000-003"] });
    await expect(dispatchTransfer(godown, b.id, { codes: ["TB1000-003"] })).rejects.toThrow("in transit");
    expect((await getTransfer(godown, b.id)).items).toEqual([]);
    await cancelTransfer(godown, b.id);
    await expect(cancelTransfer(godown, a.id)).rejects.toThrow();
    expect((await listTransfers(manager)).length).toBe(2);
    await expect(createTransfer(manager, { fromLocationId: gd1, toLocationId: sh1 })).rejects.toThrow("at least one line");
    await expect(createTransfer(manager, { fromLocationId: sh1, toLocationId: sh1, lines: [{ qty: 1 }] })).rejects.toThrow("differ");
  });
});

describe("closing a transfer with nothing scanned", () => {
  it("records every dispatched piece as short", async () => {
    const { godown, manager, gd1, sh1 } = await scenario();
    const t = await createTransfer(godown, { fromLocationId: gd1, toLocationId: sh1, direct: true });
    await dispatchTransfer(godown, t.id, { codes: ["TB1000-001", "TB1000-002"] });
    await expect(receiveTransfer(manager, t.id, { codes: [] })).rejects.toThrow("at least one");
    const closed = await receiveTransfer(manager, t.id, { final: true });
    expect(closed.status).toBe("received");
    expect(closed.shortCodes).toEqual(["TB1000-001", "TB1000-002"]);
  });
});

export type Scenario = Awaited<ReturnType<typeof scenario>> & { extra?: Actor };
