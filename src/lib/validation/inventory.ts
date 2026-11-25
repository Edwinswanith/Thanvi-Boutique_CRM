import { z } from "zod";
import { isCode39Safe } from "@/lib/code39";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const rupees = z.number().min(0).max(10_000_000);
const binCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(20)
  .refine(isCode39Safe, "Use A–Z, 0–9 and - only");

export const vendorCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  email: z.union([z.literal(""), z.email()]).default(""),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), "GSTIN must be 15 characters")
    .default(""),
  address: z.string().trim().max(300).default(""),
});

export const binCreateSchema = z.object({
  locationId: objectId,
  code: binCode,
  zone: z.string().trim().max(40).default(""),
  description: z.string().trim().max(200).default(""),
});

/** Generates a rack × shelf grid, e.g. R1-S1 … R4-S5. */
export const binGridSchema = z.object({
  locationId: objectId,
  prefix: binCode.default("R"),
  racks: z.number().int().min(1).max(50),
  shelves: z.number().int().min(1).max(20),
  zone: z.string().trim().max(40).default(""),
});

const receiptFields = z.object({
  vendorId: objectId,
  locationId: objectId,
  binId: objectId.nullable().default(null),
  costPrice: rupees.nullable().default(null),
  quantity: z.number().int().min(1).max(500),
  description: z.string().trim().max(500).default(""),
});

export const receiveSchema = z.union([receiptFields.extend({
  existingSku: z.string().trim().toUpperCase().min(1).max(40).refine(isCode39Safe, "Invalid SKU"),
}), receiptFields.extend({
  existingSku: z.undefined().optional(),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  hsn: z.string().trim().regex(/^\d{4,8}$/, "HSN must be 4–8 digits"),
  mrp: rupees.refine((v) => v > 0, "MRP is required"),
  color: z.string().trim().max(40).default(""),
  fabric: z.string().trim().max(60).default(""),
  photoIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(6).default([]),
})]);

export const moveBinSchema = z.object({ binId: objectId.nullable() });

export const transferRequestSchema = z.object({
  fromLocationId: objectId,
  toLocationId: objectId,
  note: z.string().trim().max(500).default(""),
  lines: z
    .array(
      z.object({
        productId: objectId.nullable().default(null),
        sku: z.string().trim().toUpperCase().max(30).default(""),
        description: z.string().trim().max(200).default(""),
        qty: z.number().int().min(1).max(500),
      }),
    )
    .max(100)
    .default([]),
  /** Direct transfer: the source location creates it already approved. */
  direct: z.boolean().default(false),
});

export const codesSchema = z.object({
  codes: z.array(z.string().trim().toUpperCase().min(1).max(40)).min(1).max(500),
  binId: objectId.nullable().default(null),
});

export type VendorCreate = z.infer<typeof vendorCreateSchema>;
export type ReceiveInput = z.infer<typeof receiveSchema>;
export type TransferRequestInput = z.infer<typeof transferRequestSchema>;
