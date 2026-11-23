/** Shared vendor-payables constants. Dependency-free so client components can import them. */

export const BILL_STATUSES = ["draft", "unpaid", "partial", "paid"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const VENDOR_PAYMENT_MODES = ["bank", "upi", "cheque", "cash"] as const;
export type VendorPaymentMode = (typeof VENDOR_PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<VendorPaymentMode, string> = { bank: "Bank transfer", upi: "UPI", cheque: "Cheque", cash: "Cash" };
export const BILL_STATUS_LABELS: Record<BillStatus | "overdue", string> = {
  draft: "Amount needed", unpaid: "Unpaid", partial: "Part paid", paid: "Paid", overdue: "Overdue",
};

/** Days a vendor gives to pay, until per-vendor terms are configured. */
export const DEFAULT_CREDIT_DAYS = 30;

export function billStatusFor(amount: number, paid: number): BillStatus {
  if (amount <= 0) return "draft";
  if (paid <= 0) return "unpaid";
  return paid >= amount ? "paid" : "partial";
}
