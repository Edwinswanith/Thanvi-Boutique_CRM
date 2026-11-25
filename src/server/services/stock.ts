import { Types } from "mongoose";
import { Item, ITEM_STATUSES, type ItemStatus } from "@/models/Item";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import type { Actor } from "@/server/actor";
import { locationFilter } from "@/server/scope";

export interface StockRow {
  locationId: string;
  code: string;
  name: string;
  type: string;
  counts: Record<ItemStatus, number>;
  unshelved: number;
}

const emptyCounts = (): Record<ItemStatus, number> =>
  Object.fromEntries(ITEM_STATUSES.map((s) => [s, 0])) as Record<ItemStatus, number>;

/** Stock by location × status, derived from items (never stored). Scoped to the actor. */
export async function stockSummary(actor: Actor): Promise<StockRow[]> {
  const scope = locationFilter(actor);
  const locScope = actor.role.allLocations ? {} : { _id: { $in: actor.locationIds.map((id) => new Types.ObjectId(id)) } };
  const [locations, grouped, unshelved] = await Promise.all([
    Location.find({ ...locScope, active: true }).sort({ type: 1, code: 1 }).lean(),
    Item.aggregate<{ _id: { l: Types.ObjectId; s: ItemStatus }; n: number }>([
      { $match: scope },
      { $group: { _id: { l: "$locationId", s: "$status" }, n: { $sum: 1 } } },
    ]),
    Item.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { ...scope, status: "available", binId: null } },
      { $group: { _id: "$locationId", n: { $sum: 1 } } },
    ]),
  ]);
  const unshelvedBy = new Map(unshelved.map((u) => [String(u._id), u.n]));
  return locations.map((loc) => {
    const counts = emptyCounts();
    for (const g of grouped) if (String(g._id.l) === String(loc._id)) counts[g._id.s] = g.n;
    return { locationId: String(loc._id), code: loc.code, name: loc.name, type: loc.type, counts, unshelved: unshelvedBy.get(String(loc._id)) ?? 0 };
  });
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  hsn: string;
  mrp: number;
  costPrice: number | null;
  photoId: string | null;
  available: number;
  sold: number;
  total: number;
}

/** Products with piece counts (within the actor's locations). */
export async function listProducts(actor: Actor, q = ""): Promise<ProductRow[]> {
  const search = q.trim()
    ? { $or: [{ sku: q.trim().toUpperCase() }, { name: { $regex: escapeRegex(q.trim()), $options: "i" } }, { category: { $regex: escapeRegex(q.trim()), $options: "i" } }] }
    : {};
  const scope = locationFilter(actor);
  const allowed = actor.role.allLocations ? {} : { _id: { $in: await Item.distinct("productId", scope) } };
  const products = await Product.find({ ...search, ...allowed }).select(actor.role.confidential ? "+costPrice" : "").sort({ createdAt: -1 }).limit(200).lean();
  const counts = await Item.aggregate<{ _id: { p: Types.ObjectId; s: ItemStatus }; n: number }>([
    { $match: { ...scope, productId: { $in: products.map((p) => p._id) } } },
    { $group: { _id: { p: "$productId", s: "$status" }, n: { $sum: 1 } } },
  ]);
  return products.map((p) => {
    const mine = counts.filter((c) => String(c._id.p) === String(p._id));
    const of = (s: ItemStatus) => mine.find((c) => c._id.s === s)?.n ?? 0;
    return {
      id: String(p._id),
      sku: p.sku,
      name: p.name,
      category: p.category,
      hsn: p.hsn,
      mrp: p.mrp,
      costPrice: actor.role.confidential ? (p.costPrice ?? null) : null,
      photoId: p.photoIds?.[0] ?? null,
      available: of("available"),
      sold: of("sold"),
      total: mine.reduce((a, c) => a + c.n, 0),
    };
  });
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
