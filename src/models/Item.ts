import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ITEM_STATUSES = [
  "available",
  "reserved",
  "in_transit",
  "sold",
  "rented",
  "stitching",
  "damaged",
  "returned",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** One document per physical piece. Stock counts are always derived from these. */
const itemSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, uppercase: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    binId: { type: Schema.Types.ObjectId, ref: "Bin", default: null },
    status: { type: String, enum: ITEM_STATUSES, default: "available" },
    receiptRef: { type: String, default: "" },
    transferId: { type: Schema.Types.ObjectId, ref: "Transfer", default: null },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
  },
  { timestamps: true },
);

itemSchema.index({ locationId: 1, status: 1 });
itemSchema.index({ binId: 1, status: 1 });

export type ItemDoc = InferSchemaType<typeof itemSchema>;
export const Item: Model<ItemDoc> = (models.Item as Model<ItemDoc>) || model<ItemDoc>("Item", itemSchema);
