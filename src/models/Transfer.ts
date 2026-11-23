import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const TRANSFER_STATUSES = ["requested", "approved", "in_transit", "received", "cancelled"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

const requestLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    sku: { type: String, default: "" },
    description: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const transferItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    code: { type: String, required: true },
    received: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Stock request / transfer. A store raises a request (lines) → the godown
 * approves → dispatches specific pieces (items, now in transit) → the store
 * scans them in. Short = dispatched but not scanned; excess = scanned but not dispatched.
 */
const transferSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true },
    fromLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    toLocationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: TRANSFER_STATUSES, default: "requested" },
    lines: { type: [requestLineSchema], default: [] },
    items: { type: [transferItemSchema], default: [] },
    shortCodes: { type: [String], default: [] },
    excessCodes: { type: [String], default: [] },
    note: { type: String, default: "" },
    requestedBy: { type: String, default: "" },
    approvedBy: { type: String, default: "" },
    dispatchedBy: { type: String, default: "" },
    receivedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

transferSchema.index({ status: 1, toLocationId: 1 });
transferSchema.index({ status: 1, fromLocationId: 1 });

export type TransferDoc = InferSchemaType<typeof transferSchema>;
export const Transfer: Model<TransferDoc> =
  (models.Transfer as Model<TransferDoc>) || model<TransferDoc>("Transfer", transferSchema);
