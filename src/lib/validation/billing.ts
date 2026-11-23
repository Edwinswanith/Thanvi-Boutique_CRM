import { z } from "zod";
import { INVOICE_TEMPLATES } from "@/models/InvoiceSettings";
import { objectId } from "./inventory";

import { GST_RATES } from "@/lib/gst/rates";

export { GST_RATES };

const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), "GSTIN must be 15 characters")
  .default("");
const stateCode = z.string().trim().regex(/^(\d{2})?$/, "State code is 2 digits").default("");

export const taxRuleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  hsnPrefixes: z.array(z.string().trim().regex(/^\d{2,8}$/, "HSN prefixes are 2–8 digits")).min(1).max(50),
  slabs: z
    .array(
      z.object({
        /** Rupees per piece (taxable value); null = no upper limit. */
        upTo: z.number().min(0).max(10_000_000).nullable(),
        rate: z.number().refine((r) => (GST_RATES as readonly number[]).includes(r), "Not a valid GST rate"),
      }),
    )
    .min(1)
    .max(5)
    .refine((s) => s.filter((x) => x.upTo === null).length === 1, "Exactly one slab must have no upper limit"),
  note: z.string().trim().max(300).default(""),
  status: z.enum(["draft", "approved"]).default("draft"),
  active: z.boolean().default(true),
});

export const invoiceSettingsSchema = z.object({
  legalName: z.string().trim().min(2).max(120),
  tradeName: z.string().trim().max(120).default(""),
  address: z.string().trim().max(400).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.union([z.literal(""), z.email()]).default(""),
  gstin,
  stateCode: z.string().trim().regex(/^\d{2}$/, "State code is 2 digits"),
  pricesIncludeTax: z.boolean(),
  roundToRupee: z.boolean(),
  template: z.enum(INVOICE_TEMPLATES),
  title: z.string().trim().min(2).max(40),
  showHsn: z.boolean(),
  showSalesperson: z.boolean(),
  terms: z.string().trim().max(1000).default(""),
  footer: z.string().trim().max(300).default(""),
  signatureLabel: z.string().trim().max(60).default(""),
});

const discount = z
  .object({ type: z.enum(["percent", "flat"]), value: z.number().min(0).max(10_000_000) })
  .nullable()
  .default(null);

export const createInvoiceSchema = z.object({
  locationId: objectId,
  channel: z.enum(["store", "online", "instagram"]).default("store"),
  lines: z
    .array(z.object({ code: z.string().trim().toUpperCase().min(1).max(40), discount }))
    .min(1, "Add at least one item")
    .max(200),
  /** Bill-level discount; flat values are in rupees. */
  billDiscount: discount,
  customer: z
    .object({
      name: z.string().trim().max(120).default(""),
      phone: z.string().trim().max(20).default(""),
      gstin,
      address: z.string().trim().max(300).default(""),
      stateCode,
    })
    .default({ name: "", phone: "", gstin: "", address: "", stateCode: "" }),
  payment: z.object({
    mode: z.enum(["cash", "upi", "card", "razorpay"]),
    reference: z.string().trim().max(80).default(""),
  }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
