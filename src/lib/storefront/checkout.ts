import { z } from "zod";
import { MAX_QTY } from "./cart";
import { GST_STATES } from "@/lib/gst/states";

export const checkoutQuoteSchema = z.object({
  paymentMethod: z.enum(["dummy", "cod"]),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    phone: z.string().trim().regex(/^[0-9+ ()-]{10,20}$/, "Enter a valid phone number"),
    address: z.string().trim().min(5).max(250),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().refine((state) => GST_STATES.some(([, label]) => label === state), "Select a delivery state or union territory"),
    postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a six-digit Indian PIN code"),
  }),
  lines: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
    quantity: z.number().int().min(1).max(MAX_QTY),
    unitPrice: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })).min(1).max(50).refine((lines) => new Set(lines.map((line) => line.slug)).size === lines.length, "Duplicate product"),
});

export const checkoutSchema = checkoutQuoteSchema.extend({
  requestId: z.uuid(),
  expectedTotal: z.number().int().nonnegative().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export interface CheckoutQuote {
  merchandise: number;
  shipping: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  total: number;
}

export interface CheckoutResult {
  orderNumber: string;
  total: number;
  paymentMethod: CheckoutInput["paymentMethod"];
  paymentStatus: "test_paid" | "pending";
  breakdown?: CheckoutQuote;
  invoiceUrl?: string;
}
