import { z } from "zod";
import { isCode39Safe } from "@/lib/code39";
import { LOCATION_TYPES } from "@/models/Location";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const upperCode = (max: number) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .max(max)
    .refine(isCode39Safe, "Use only A–Z, 0–9 and - . $ / + % (barcode-safe characters)");

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required").max(200),
});

export const locationCreateSchema = z.object({
  code: upperCode(12).pipe(z.string().min(2, "Code must be at least 2 characters")),
  name: z.string().trim().min(2).max(80),
  type: z.enum(LOCATION_TYPES),
  address: z.string().trim().max(300).default(""),
  city: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), "GSTIN must be 15 characters")
    .default(""),
  invoicePrefix: upperCode(10).default(""),
});
export const locationUpdateSchema = locationCreateSchema.partial().extend({ active: z.boolean().optional() });

export const roleCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  permissions: z.array(z.string()).max(500).default([]),
  confidential: z.boolean().default(false),
  allLocations: z.boolean().default(false),
});
export const roleUpdateSchema = roleCreateSchema.partial();

const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200)
  .regex(/[A-Za-z]/, "Password needs a letter")
  .regex(/[0-9]/, "Password needs a number");

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(20).default(""),
  password,
  roleId: objectId,
  locationIds: z.array(objectId).max(100).default([]),
});
export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .partial()
  .extend({ password: password.optional(), active: z.boolean().optional() });

export const numberSeriesUpdateSchema = z.object({
  prefix: upperCode(10),
  next: z.number().int().min(0).max(999_999_999),
  padding: z.number().int().min(1).max(10),
});

export type LocationCreate = z.infer<typeof locationCreateSchema>;
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;
export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type NumberSeriesUpdate = z.infer<typeof numberSeriesUpdateSchema>;
