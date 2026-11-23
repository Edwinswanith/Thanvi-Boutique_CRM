import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import type { TaxRuleInput } from "@/lib/gst/engine";
import { toPaise } from "@/lib/money";
import { invoiceSettingsSchema, taxRuleSchema } from "@/lib/validation/billing";
import { InvoiceSettings } from "@/models/InvoiceSettings";
import { TaxRule } from "@/models/TaxRule";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";

export interface TaxRuleView extends TaxRuleInput {
  id: string;
  status: "draft" | "approved";
  note: string;
  active: boolean;
}

export type InvoiceSettingsView = ReturnType<typeof invoiceSettingsSchema.parse>;

interface RuleLean {
  _id: Types.ObjectId;
  name: string;
  hsnPrefixes: string[];
  slabs: { upTo?: number | null; rate: number }[];
  status: "draft" | "approved";
  note?: string | null;
  active: boolean;
}

const ruleView = (r: RuleLean): TaxRuleView => ({
  id: String(r._id),
  name: r.name,
  hsnPrefixes: r.hsnPrefixes,
  slabs: r.slabs.map((s) => ({ upTo: s.upTo ?? null, rate: s.rate })),
  status: r.status,
  note: r.note ?? "",
  active: r.active,
});

export async function listTaxRules(): Promise<TaxRuleView[]> {
  return (await TaxRule.find().sort({ name: 1 }).lean<RuleLean[]>()).map(ruleView);
}

export async function activeTaxRules(): Promise<TaxRuleView[]> {
  return (await TaxRule.find({ active: true }).lean<RuleLean[]>()).map(ruleView);
}

function toStored(input: unknown) {
  const data = taxRuleSchema.parse(input);
  return { ...data, slabs: data.slabs.map((s) => ({ upTo: s.upTo === null ? null : toPaise(s.upTo), rate: s.rate })) };
}

export async function saveTaxRule(actor: Actor, id: string | null, input: unknown): Promise<TaxRuleView> {
  const data = toStored(input);
  const before = id ? await TaxRule.findById(id).lean() : null;
  if (id && !before) throw new AppError("Tax rule not found", 404);
  const doc = id
    ? await TaxRule.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" }).lean<RuleLean>()
    : ((await TaxRule.create(data)).toObject() as RuleLean);
  await writeAudit(actor, { action: id ? "taxRule.update" : "taxRule.create", entity: "taxRule", entityId: String(doc!._id), before, after: doc });
  return ruleView(doc!);
}

export async function getInvoiceSettings(): Promise<InvoiceSettingsView> {
  const doc = await InvoiceSettings.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return invoiceSettingsSchema.parse({ ...doc, email: doc?.email ?? "" });
}

export async function updateInvoiceSettings(actor: Actor, input: unknown): Promise<InvoiceSettingsView> {
  const data = invoiceSettingsSchema.parse(input);
  const before = await getInvoiceSettings();
  await InvoiceSettings.updateOne({ key: "default" }, { $set: data }, { upsert: true });
  await writeAudit(actor, { action: "invoiceSettings.update", entity: "invoiceSettings", entityId: "default", before, after: data });
  return getInvoiceSettings();
}
