import { describe, expect, it } from "vitest";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { StockMovement } from "@/models/StockMovement";
import type { Actor } from "@/server/actor";
import { createBin, createBinGrid, listBins } from "@/server/services/bins";
import { itemHistory, lookupItem, moveItemToBin } from "@/server/services/items";
import { receiveStock } from "@/server/services/receiving";
import { listProducts, stockSummary } from "@/server/services/stock";
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
  const receipt = await receiveStock(godown, {
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
    const { manager, vendor, gd1, sh1, bins } = await scenario();
    const base = { vendorId: vendor.id, name: "X saree", category: "Saree", hsn: "5208", mrp: 900, quantity: 1 };
    await expect(receiveStock(manager, { ...base, locationId: gd1 })).rejects.toThrow("access");
    await expect(receiveStock(manager, { ...base, locationId: sh1, binId: bins[0].id })).rejects.toThrow("bin");
    await expect(receiveStock(manager, { ...base, locationId: sh1, hsn: "12" })).rejects.toThrow();
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
