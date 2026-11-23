import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const INVOICE_STATUSES = ["open", "paid", "closed", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const PAYMENT_MODES = ["cash", "upi", "card", "razorpay"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export const CHANNELS = ["store", "online", "instagram"] as const;

const lineSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    code: String,
    sku: String,
    name: String,
    hsn: String,
    mrp: Number,
    discount: Number,
    price: Number,
    taxable: Number,
    rate: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    total: Number,
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    mode: { type: String, enum: PAYMENT_MODES, required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, default: "" },
    status: { type: String, enum: ["pending", "captured", "failed"], default: "captured" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * Invoices are immutable once issued: line values and the seller snapshot are
 * frozen at billing time so later settings changes never alter past invoices.
 * Money is in paise.
 */
const invoiceSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    channel: { type: String, enum: CHANNELS, default: "store" },
    status: { type: String, enum: INVOICE_STATUSES, default: "open" },
    supplyType: { type: String, enum: ["intra", "inter"], required: true },
    placeOfSupply: { type: String, required: true },
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
      stateCode: { type: String, default: "" },
    },
    lines: { type: [lineSchema], required: true },
    totals: {
      mrp: Number,
      discount: Number,
      taxable: Number,
      cgst: Number,
      sgst: Number,
      igst: Number,
      roundOff: Number,
      grandTotal: Number,
    },
    taxBreakup: { type: [{ rate: Number, taxable: Number, cgst: Number, sgst: Number, igst: Number, _id: false }], default: [] },
    payments: { type: [paymentSchema], default: [] },
    razorpay: {
      linkId: { type: String, default: "" },
      shortUrl: { type: String, default: "" },
    },
    seller: { type: Schema.Types.Mixed, required: true },
    salespersonId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    salespersonName: { type: String, default: "" },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true },
);

invoiceSchema.index({ locationId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ "razorpay.linkId": 1 });

export type InvoiceDoc = InferSchemaType<typeof invoiceSchema>;
export const Invoice: Model<InvoiceDoc> = (models.Invoice as Model<InvoiceDoc>) || model<InvoiceDoc>("Invoice", invoiceSchema);
