import { z } from "zod";
import { BILL_STATUSES, VENDOR_PAYMENT_MODES } from "@/lib/payables";
import { objectId } from "./inventory";

const rupees = z.number().positive("Enter an amount above zero").max(100_000_000);
const pastOrToday = z.coerce.date().refine((d) => d.getTime() <= Date.now() + 86_400_000, "The payment date can't be in the future");

export const vendorPaymentSchema = z.object({
  amount: rupees,
  mode: z.enum(VENDOR_PAYMENT_MODES),
  reference: z.string().trim().max(80).default(""),
  note: z.string().trim().max(300).default(""),
  paidAt: pastOrToday.optional(),
});

export const billUpdateSchema = z
  .object({
    amount: rupees.optional(),
    vendorInvoiceNo: z.string().trim().max(40).optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

export const BILL_FILTERS = [...BILL_STATUSES, "open", "overdue"] as const;
export type BillFilter = (typeof BILL_FILTERS)[number];

export const billQuerySchema = z.object({
  status: z.enum(BILL_FILTERS).optional(),
  vendorId: objectId.optional(),
});
