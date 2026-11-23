import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

import { VENDOR_PAYMENT_MODES } from "@/lib/payables";

export { VENDOR_PAYMENT_MODES, type VendorPaymentMode } from "@/lib/payables";

/** One payment made to a vendor against one bill. Append-only. Money is in paise. */
const vendorPaymentSchema = new Schema(
  {
    billId: { type: Schema.Types.ObjectId, ref: "VendorBill", required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: VENDOR_PAYMENT_MODES, required: true },
    reference: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    paidAt: { type: Date, required: true },
    recordedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    recordedBy: { type: String, default: "" },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

vendorPaymentSchema.index({ paidAt: -1 });

export type VendorPaymentDoc = InferSchemaType<typeof vendorPaymentSchema>;
export const VendorPayment: Model<VendorPaymentDoc> =
  (models.VendorPayment as Model<VendorPaymentDoc>) || model<VendorPaymentDoc>("VendorPayment", vendorPaymentSchema);
