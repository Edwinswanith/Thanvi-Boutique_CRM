import type { ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import { formatSeriesCode } from "@/lib/code39";
import { numberSeriesUpdateSchema } from "@/lib/validation/schemas";
import { NumberSeries } from "@/models/NumberSeries";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";

export interface SeriesView {
  key: string;
  label: string;
  prefix: string;
  next: number;
  padding: number;
  preview: string;
}

function toView(doc: { key: string; label: string; prefix?: string | null; next: number; padding?: number | null }): SeriesView {
  const prefix = doc.prefix ?? "";
  const padding = doc.padding ?? 4;
  return { key: doc.key, label: doc.label, prefix, next: doc.next, padding, preview: formatSeriesCode(prefix, doc.next, padding) };
}

/**
 * Issues the next code for a series atomically. Concurrent callers always get
 * distinct numbers because the increment happens inside a single findOneAndUpdate.
 */
export async function nextCode(key: string, session?: ClientSession): Promise<string> {
  const doc = await NumberSeries.findOneAndUpdate({ key }, { $inc: { next: 1 } }, { returnDocument: "before", session }).lean();
  if (!doc) throw new AppError(`Number series "${key}" is not configured`, 500);
  return formatSeriesCode(doc.prefix ?? "", doc.next, doc.padding ?? 4);
}

export async function listSeries(): Promise<SeriesView[]> {
  const docs = await NumberSeries.find().sort({ key: 1 }).lean();
  return docs.map(toView);
}

export async function updateSeries(actor: Actor, key: string, input: unknown): Promise<SeriesView> {
  const data = numberSeriesUpdateSchema.parse(input);
  const before = await NumberSeries.findOne({ key }).lean();
  if (!before) throw new AppError("Number series not found", 404);
  const updated = await NumberSeries.findOneAndUpdate({ key }, { $set: data }, { returnDocument: "after" }).lean();
  await writeAudit(actor, {
    action: "numberSeries.update",
    entity: "numberSeries",
    entityId: key,
    before: toView(before),
    after: toView(updated!),
  });
  return toView(updated!);
}

export interface SeriesSeed {
  key: string;
  label: string;
  prefix: string;
  next: number;
  padding: number;
}

/** Creates the series if missing; never overwrites admin changes. */
export async function ensureSeries(seed: SeriesSeed): Promise<void> {
  await NumberSeries.updateOne({ key: seed.key }, { $setOnInsert: seed }, { upsert: true });
}
