import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

import { BILL_STATUSES } from "@/lib/payables";

export { BILL_STATUSES, type BillStatus } from "@/lib/payables";

/**
 * `draft` = delivery recorded but the amount is still to be filled in (no cost price at receiving).
 * What the business owes a vendor for one delivery (goods receipt). Money is in paise.
 * `paidAmount` only ever changes together with a `VendorPayment` row, in one transaction.
 */
const vendorBillSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    receiptRef: { type: String, default: "" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    sku: { type: String, default: "" },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: BILL_STATUSES, required: true },
    /** The number printed on the vendor's own invoice, if they gave one. */
    vendorInvoiceNo: { type: String, default: "", uppercase: true, trim: true },
    billDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

vendorBillSchema.index({ status: 1, dueDate: 1 });
vendorBillSchema.index({ receiptRef: 1 });

export type VendorBillDoc = InferSchemaType<typeof vendorBillSchema>;
export const VendorBill: Model<VendorBillDoc> = (models.VendorBill as Model<VendorBillDoc>) || model<VendorBillDoc>("VendorBill", vendorBillSchema);
