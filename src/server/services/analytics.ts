import type { PipelineStage } from "mongoose";
import { forecastSales, type Forecast } from "@/lib/analytics/forecast";
import { addDays, fillDays, istDay, pctChange, rangeWindow, startOfIstDay, TIMEZONE, type DayRow, type RangeKey } from "@/lib/analytics/periods";
import { Invoice } from "@/models/Invoice";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { can, type Actor } from "@/server/actor";
import { assertLocation, locationFilter, oid } from "@/server/scope";

/** Invoices that count as sales. Open (awaiting payment) and cancelled ones don't. */
const SOLD = ["closed", "paid"];
const FORECAST_HISTORY_DAYS = 56;
const FORECAST_HORIZON = 7;
const TOP_N = 8;
export const DEMO_INVOICE_PREFIX = "DEMO-";

interface Group<K = string> { _id: K; amount: number; count: number; pieces?: number }
interface SkuGroup { _id: string; name: string; pieces: number; amount: number; taxable: number }
interface Totals { amount: number; taxable: number; gst: number; discount: number; count: number; pieces: number }
interface Facets {
  totals: Totals[];
  daily: Group[];
  byLocation: Group<unknown>[];
  byChannel: Group[];
  bySalesperson: Group[];
  byPayment: { _id: string; amount: number }[];
  bySku: SkuGroup[];
}

export interface Change { value: number; previous: number; change: number | null }
export interface LocationSales { id: string; code: string; name: string; type: string; amount: number; count: number }
export interface Overview {
  range: RangeKey;
  generatedAt: string;
  locationId: string | null;
  kpis: { revenue: Change; invoices: Change; avgBill: Change; pieces: Change; netSales: number; gst: number; discount: number };
  daily: DayRow[];
  byLocation: LocationSales[];
  byChannel: { channel: string; amount: number; count: number }[];
  bySalesperson: { name: string; amount: number; count: number; pieces: number }[];
  byPayment: { mode: string; amount: number }[];
  topProducts: { sku: string; name: string; pieces: number; amount: number }[];
  /** Only for roles allowed to see cost. `coveredPct` = share of sales that has a cost price on record. */
  margin: { amount: number; pct: number; coveredPct: number } | null;
  pending: { count: number; amount: number };
  websiteOrders: { invoiced: { count: number; amount: number }; dummy: { count: number; amount: number }; cod: { count: number; amount: number }; cancelled: number } | null;
  stock: { available: number; inTransit: number; reserved: number };
  forecast: Forecast;
  hasDemo: boolean;
}

async function websiteOrders(actor: Actor, match: Record<string, unknown>): Promise<Overview["websiteOrders"]> {
  if (!can(actor, "orders.view")) return null;
  const [rows, invoiced] = await Promise.all([Order.aggregate<Group>([
    { $match: { ...match, test: true } },
    { $group: {
      _id: { $cond: [{ $eq: ["$status", "cancelled"] }, "cancelled", "$paymentMethod"] },
      amount: { $sum: "$total" },
      count: { $sum: 1 },
    } },
  ]), totalsFor({ ...match, channel: "online", status: { $in: SOLD }, number: { $not: { $regex: `^${DEMO_INVOICE_PREFIX}` } } })]);
  const summary = (method: string) => {
    const row = rows.find((entry) => entry._id === method);
    return { count: row?.count ?? 0, amount: row?.amount ?? 0 };
  };
  return { invoiced: { count: invoiced.count, amount: invoiced.amount }, dummy: summary("dummy"), cod: summary("cod"), cancelled: summary("cancelled").count };
}

const money = { amount: { $sum: "$totals.grandTotal" }, count: { $sum: 1 } };
const pieces = { pieces: { $sum: { $size: "$lines" } } };
const ZERO: Totals = { amount: 0, taxable: 0, gst: 0, discount: 0, count: 0, pieces: 0 };

const totalsStage: PipelineStage.FacetPipelineStage = {
  $group: {
    _id: null,
    ...money,
    ...pieces,
    taxable: { $sum: "$totals.taxable" },
    discount: { $sum: "$totals.discount" },
    gst: { $sum: { $add: [{ $ifNull: ["$totals.cgst", 0] }, { $ifNull: ["$totals.sgst", 0] }, { $ifNull: ["$totals.igst", 0] }] } },
  },
};
const dayKey = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } };

async function facets(match: Record<string, unknown>): Promise<Facets> {
  const [result] = await Invoice.aggregate<Facets>([
    { $match: match },
    {
      $facet: {
        totals: [totalsStage],
        daily: [{ $group: { _id: dayKey, ...money } }],
        byLocation: [{ $group: { _id: "$locationId", ...money } }],
        byChannel: [{ $group: { _id: "$channel", ...money } }],
        bySalesperson: [{ $group: { _id: "$salespersonName", ...money, ...pieces } }],
        byPayment: [{ $unwind: "$payments" }, { $match: { "payments.status": "captured" } }, { $group: { _id: "$payments.mode", amount: { $sum: "$payments.amount" } } }],
        bySku: [{ $unwind: "$lines" }, { $group: { _id: "$lines.sku", name: { $first: "$lines.name" }, pieces: { $sum: 1 }, amount: { $sum: "$lines.total" }, taxable: { $sum: "$lines.taxable" } } }],
      },
    },
  ]);
  return result;
}

async function totalsFor(match: Record<string, unknown>): Promise<Totals> {
  const [t] = await Invoice.aggregate<Totals>([{ $match: match }, totalsStage]);
  return t ?? ZERO;
}

async function dailyHistory(base: Record<string, unknown>, now: Date): Promise<DayRow[]> {
  const today = istDay(now);
  const end = startOfIstDay(now);
  const start = new Date(end.getTime() - FORECAST_HISTORY_DAYS * 86_400_000);
  const [first] = await Invoice.find(base).sort({ createdAt: 1 }).limit(1).select("createdAt").lean<{ createdAt: Date }[]>();
  if (!first || first.createdAt >= end) return [];
  const rows = await Invoice.aggregate<Group>([{ $match: { ...base, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: dayKey, ...money } }]);
  const firstDay = istDay(first.createdAt > start ? first.createdAt : start);
  const days: string[] = [];
  for (let d = firstDay; d < today; d = addDays(d, 1)) days.push(d);
  return fillDays(days, rows.map((r) => ({ date: r._id, amount: r.amount, count: r.count })));
}

async function marginFor(actor: Actor, match: Record<string, unknown>): Promise<Overview["margin"]> {
  if (!actor.role.confidential) return null;
  const [totals] = await Invoice.aggregate<{ coveredTaxable: number; totalTaxable: number; cost: number }>([
    { $match: match },
    { $unwind: "$lines" },
    { $lookup: { from: Item.collection.name, localField: "lines.itemId", foreignField: "_id", as: "piece" } },
    { $lookup: { from: Product.collection.name, localField: "lines.sku", foreignField: "sku", as: "product" } },
    { $set: { cost: {
      $let: {
        vars: { piece: { $arrayElemAt: ["$piece", 0] }, product: { $arrayElemAt: ["$product", 0] } },
        in: { $cond: [{ $eq: [{ $type: "$$piece.purchaseCost" }, "missing"] }, "$$product.costPrice", "$$piece.purchaseCost"] },
      },
    } } },
    { $group: {
      _id: null,
      totalTaxable: { $sum: "$lines.taxable" },
      coveredTaxable: { $sum: { $cond: [{ $isNumber: "$cost" }, "$lines.taxable", 0] } },
      cost: { $sum: "$cost" },
    } },
  ]);
  if (!totals || totals.coveredTaxable <= 0) return null;
  const { coveredTaxable, totalTaxable, cost } = totals;
  const amount = coveredTaxable - cost;
  return { amount, pct: Math.round((amount / coveredTaxable) * 1000) / 10, coveredPct: Math.round((coveredTaxable / totalTaxable) * 100) };
}

async function stockFor(scope: Record<string, unknown>): Promise<Overview["stock"]> {
  const rows = await Item.aggregate<{ _id: string; n: number }>([
    { $match: { ...scope, status: { $in: ["available", "in_transit", "reserved"] } } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const of = (s: string) => rows.find((r) => r._id === s)?.n ?? 0;
  return { available: of("available"), inTransit: of("in_transit"), reserved: of("reserved") };
}

function change(value: number, previous: number): Change {
  return { value, previous, change: pctChange(value, previous) };
}

const avg = (t: Totals) => (t.count ? Math.round(t.amount / t.count) : 0);
const byAmount = <T extends { amount: number }>(rows: T[]): T[] => [...rows].sort((a, b) => b.amount - a.amount);

async function locationRows(actor: Actor, groups: Group<unknown>[]): Promise<LocationSales[]> {
  const scope = actor.role.allLocations ? {} : { _id: { $in: actor.locationIds.map((id) => oid(id, "location")) } };
  const locations = await Location.find({ ...scope, type: { $ne: "godown" }, active: true }).sort({ code: 1 }).lean();
  const sold = new Map(groups.map((g) => [String(g._id), g]));
  return byAmount(locations.map((l) => {
    const g = sold.get(String(l._id));
    return { id: String(l._id), code: l.code, name: l.name, type: l.type, amount: g?.amount ?? 0, count: g?.count ?? 0 };
  }));
}

/**
 * Sales overview for the dashboard. Scoped to the actor's locations; cost-based
 * figures (margin) are only computed for roles with `confidential`.
 */
export async function salesOverview(actor: Actor, opts: { range: RangeKey; locationId?: string | null }, now: Date = new Date()): Promise<Overview> {
  const scope = locationFilter(actor);
  if (opts.locationId) assertLocation(actor, opts.locationId);
  const locScope = opts.locationId ? { locationId: oid(opts.locationId, "location") } : scope;
  const base = { ...locScope, status: { $in: SOLD } };
  const w = rangeWindow(opts.range, now);
  const current = { ...base, createdAt: { $gte: w.from, $lte: w.to } };

  const [f, prev, history, pending, stock, hasDemo, margin, shopTestOrders] = await Promise.all([
    facets(current),
    totalsFor({ ...base, createdAt: { $gte: w.prevFrom, $lt: w.from } }),
    dailyHistory(base, now),
    totalsFor({ ...locScope, status: "open" }),
    stockFor(locScope),
    Invoice.exists({ ...locScope, number: { $regex: `^${DEMO_INVOICE_PREFIX}` } }),
    marginFor(actor, current),
    websiteOrders(actor, { ...locScope, createdAt: current.createdAt }),
  ]);
  const t = f.totals[0] ?? ZERO;

  return {
    range: opts.range,
    generatedAt: now.toISOString(),
    locationId: opts.locationId ?? null,
    kpis: {
      revenue: change(t.amount, prev.amount),
      invoices: change(t.count, prev.count),
      avgBill: change(avg(t), avg(prev)),
      pieces: change(t.pieces, prev.pieces),
      netSales: t.taxable,
      gst: t.gst,
      discount: t.discount,
    },
    daily: fillDays(w.days, f.daily.map((d) => ({ date: d._id, amount: d.amount, count: d.count }))),
    byLocation: await locationRows(actor, f.byLocation),
    byChannel: byAmount(f.byChannel.map((c) => ({ channel: c._id, amount: c.amount, count: c.count }))),
    bySalesperson: byAmount(f.bySalesperson.map((s) => ({ name: s._id || "Unassigned", amount: s.amount, count: s.count, pieces: s.pieces ?? 0 }))).slice(0, TOP_N),
    byPayment: byAmount(f.byPayment.map((p) => ({ mode: p._id, amount: p.amount }))),
    topProducts: byAmount(f.bySku.map((s) => ({ sku: s._id, name: s.name, pieces: s.pieces, amount: s.amount }))).slice(0, TOP_N),
    margin,
    pending: { count: pending.count, amount: pending.amount },
    websiteOrders: shopTestOrders,
    stock,
    forecast: forecastSales(history.map((d) => ({ date: d.date, amount: d.amount })), FORECAST_HORIZON, addDays(istDay(now), 1)),
    hasDemo: Boolean(hasDemo),
  };
}
